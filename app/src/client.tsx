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
    <div id="root">
      <script dangerouslySetInnerHTML={{ __html: clientScripts }}></script>

      <h1>URL短縮/アナリティクス（カウントしかまだない）</h1>
      <ul>
        {list.map((list: any) => (
          <li>
            original: ${list.originalURL}
            <br />
            <a href={"/r/" + list.customSlug}>shorturl: {list.customSlug}</a>
            <p>analytics: {list.analyticsData}</p>
            <button onClick={"deleteButton('" + list.customSlug + "')"}>
              delete
            </button>
          </li>
        ))}
      </ul>
      <span>
        original url
        <input type="text" id="originalURL" />
        custom slug
        <input type="text" id="customSlug" />
        analytics
        <input type="checkbox" id="isAnalyticsEnabled" />
        <button onClick="addButton()">submit</button>
      </span>
    </div>
  );
});
export default client;
