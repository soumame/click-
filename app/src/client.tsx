//クライアント側でAPIを使用するには、別のworkersを作成する必要があるため、同じWorkersで完結させる場合は、こちらでもPrismaClientを使用しないといけないというなんとも残念な...
import { Hono } from "hono";
import { jsx } from "hono/jsx";
import { raw } from "hono/html";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

type Bindings = {
  DB: D1Database;
};
const client = new Hono<{ Bindings: Bindings }>();

client.get("/", async (c) => {
  //暫定的なセキュリティ対策：クエリパラメータでの認証
  const query = c.req.query("hehe");
  if (query !== "trash") {
    return (
      c.render(
        <div>
          <h1>short url service</h1>
          <p>So Tokumaru</p>
        </div>
      ),
    );
  }

  const adapter = new PrismaD1(c.env.DB);
  const prisma = new PrismaClient({ adapter });
  const list = await prisma.uRLs.findMany();
  console.log(list);

  const clientScripts = `
  function deleteButton(slug) {
    fetch('/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customSlug: slug })
    }).then(() => window.location.reload());
  }

  async function addButton() {
    const originalURL = document.getElementById('originalURL').value;
    const customSlug = document.getElementById('customSlug').value;
    const isAnalyticsEnabled = document.getElementById('isAnalyticsEnabled').checked;

    await fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalURL: originalURL,
        customSlug: customSlug,
        isAnalyticsEnabled: isAnalyticsEnabled
      })
    });
    window.location.reload();
  }

`;

  return c.render(
    <body class="w-screen h-screen bg-gradient-to-r from-slate-900 to-gray-800">
      <div id="root" class="justify-center items-center flex flex-col text-white py-10 gap-3">
      <script dangerouslySetInnerHTML={{ __html: clientScripts }}></script>
      <script src="https://cdn.tailwindcss.com"></script>
      <h1 class="text-3xl font-semibold">URL短縮/アナリティクス（カウントしかまだない）</h1>
      <ul class="h-full w-full max-w-3xl overflow-scroll gap-2 flex flex-col">
        {list.map((list: any) => (
          <li class="w-full bg-gray-700 p-3 rounded-xl shadow gap-2">
            <span class="">
              <p class="text-xl">To:{list.originalURL}</p>
            </span>

            <span>analytics: {list.analyticsData}</span>
            <span class="flex gap-2">
            <a class="p-1 px-3 rounded-full bg-gray-600 hover:bg-gray-500 border border-blue-600 hover:border-blue-500 transition" href={list.customSlug}>
              short url slug: {list.customSlug}
            </a>
            <button onClick={"deleteButton('" + list.customSlug + "')"} class="p-1 px-3 rounded-full bg-gray-600 hover:bg-gray-500 border border-red-600 hover:border-red-500 transition">
              delete
            </button>
            </span>


          </li>
        ))}
      </ul>
      <div class="w-full rounded-xl max-w-4xl bg-gray-600 p-4">
        <span class="flex flex-col">
        original url
        <input class=" rounded-3xl border-yellow-400 text-black bg-gray-300" type="text" id="originalURL" />

        </span>
        <span class="flex flex-col">
        custom slug
        <input class="rounded-3xl border-blue-400 text-black bg-gray-300" type="text" id="customSlug" />

        </span>
        <span class="flex flex-col">
        analytics
        <input class="p-2 rounded-3xl border-green-400" type="checkbox" id="isAnalyticsEnabled" />

        </span>
        <button class="p-2 rounded-3xl bg-red-600" onClick="addButton()">submit</button>
      </div>
    </div>
    </body>
    
  );
});
export default client;
