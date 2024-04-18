import { Hono } from "hono";
import { html } from "hono/html";

import client from "./client";

import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

const randomString = (length: number) => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

app.route("/", client);

//取得：短縮URLを取得する
app.get("/get", async (c) => {
  const adapter = new PrismaD1(c.env.DB);
  const prisma = new PrismaClient({ adapter });
  const list = await prisma.uRLs.findMany();
  return c.json(list);
});

//追加：短縮URLを追加する
app.post("/add", async (c) => {
  const adapter = new PrismaD1(c.env.DB);
  const prisma = new PrismaClient({ adapter });

  const body = await c.req.json();
  try {
    //パスワードが設定されている場合は、パスワードをチェックし、正しくない場合はエラーを返す

    //必要なパラメータが設定されていない場合はエラーを返す
    if (!body.originalURL) {
      throw new Error("url is required");
    }
    //Analyticsのデータを初期化する
    interface AnalyticsData {
      totalClicks: number;
      clicksByCountry: {
        country: string;
        clicks: number;
      }[];
      clicksByUserAgent: {
        userAgent: string;
        clicks: number;
      }[];
      clicksByLanguage: {
        language: string;
        clicks: number;
      }[];
    }
    const analyticsData: AnalyticsData = {
      totalClicks: 0,
      clicksByCountry: [
        {
          country: "unknown",
          clicks: 0,
        },
      ],
      clicksByUserAgent: [
        {
          userAgent: "unknown",
          clicks: 0,
        },
      ],
      clicksByLanguage: [
        {
          language: "unknown",
          clicks: 0,
        },
      ],
    };

    //短縮URLがすでに存在する場合はエラーを返す

    //データベースに短縮URLを追加する
    const addURL = await prisma.uRLs.create({
      data: {
        originalURL: body.originalURL,
        isAnalyticsEnabled: body.isAnalyticsEnabled,
        analyticsData: JSON.stringify(analyticsData),
        customSlug: body.customSlug || randomString(8),
      },
    });

    addURL;
    return c.text("succesfully added");
  } catch (e) {
    return c.text("error occured" + e);
  }
});

//削除：短縮URLを削除する
app.delete("/delete", async (c) => {
  const adapter = new PrismaD1(c.env.DB);
  const prisma = new PrismaClient({ adapter });
  const body = await c.req.json();
  try {
    //パスワードが設定されている場合は、パスワードをチェックし、正しくない場合はエラーを返す

    //必要なパラメータが設定されていない場合はエラーを返す
    if (!body.customSlug) {
      throw new Error("customSlug is required for delete");
    }
    //データベースに短縮URLを追加する
    const deleteURL = await prisma.uRLs.delete({
      where: {
        customSlug: body.customSlug,
      },
    });

    deleteURL;
    return c.text("succesfully deleted");
  } catch (e) {
    return c.text("error occured" + e);
  }
});

//リダイレクト：短縮URLを元のURLにリダイレクトする
app.get("r/:shortUrl", async (c) => {
  const adapter = new PrismaD1(c.env.DB);
  const prisma = new PrismaClient({ adapter });

  const shortUrl = c.req.param("shortUrl");
  //データベースを参照して、shortUrlに対応するURLを取得する
  const url = await prisma.uRLs.findUnique({
    where: {
      customSlug: shortUrl,
    },
  });
  //urlが存在しない場合はエラーを返す
  if (!url) {
    return (
      c.text("error occured"),
      c.status(404),
      c.redirect("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    );
  }

  //Analyticsが有効になっている場合は、アクセスデータを記録する
  if (url.isAnalyticsEnabled === true) {
    //アクセスデータを一度取得する
    const ExtractedAnalyticsData = JSON.parse(url.analyticsData);
    //アクセスデータを更新する
    const updatedAnalyticsData = {
      totalClicks: ExtractedAnalyticsData.totalClicks + 1,
      clicksByCountry: ExtractedAnalyticsData.clicksByCountry,
      clicksByUserAgent: ExtractedAnalyticsData.clicksByUserAgent,
      clicksByLanguage: ExtractedAnalyticsData.clicksByLanguage,
    };
    await prisma.uRLs.update({
      where: {
        customSlug: shortUrl,
      },
      data: {
        analyticsData: JSON.stringify(updatedAnalyticsData),
      },
    });
  }

  //取得できたら、そのURLにリダイレクトする
  return c.redirect(url.originalURL);
});

export default app;
