import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.15-alpha/deno-dom-wasm.ts";
import { Application } from "https://deno.land/x/abc@v1.3.3/mod.ts";

const HTML = `

<!DOCTYPE html>
<html lang="zh-cn">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>中共教育站内搜索</title>
    <script src="https://cdn.jsdelivr.net/npm/vue@2/dist/vue.js"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.min.css"
    />
  </head>
  <body>
    <div id="app">
      <h5>没反应就是没有结果，多次没反应就是出问题了</h5>
      <input
        style="display: inline"
        type="text"
        v-model="keyword"
        placeholder="输入问题"
      />
      <button @click="search">搜索</button>

      <div v-for="result in results">
        <li>
          <a :href="'/detail?url=' + encodeURIComponent(result.url)" target="_blank">
            {{ result.title }}
          </a>
          <div>{{ result.content }}</div>
        </li>
        <br />
      </div>
    </div>
    <script>
      var app = new Vue({
        el: '#app',
        methods: {
          search: function () {
            axios
              .post('/', {
                keyword: this.keyword,
              })
              .then((resp) => {
                this.results = resp.data;
              });
          },
        },
        data: {
          keyword: '',
          results: [],
        },
      });
    </script>
  </body>
</html>
`;

interface Result {
  title: string;
  content: string;
  url: string;
}

async function search(keyword: string): Promise<Result[] | undefined> {
  const resp = await fetch(
    `http://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&tn=baidu&wd=${keyword}%20site%3Awww.offcn.com`,
  );

  const text = await resp.text();

  const doc = new DOMParser().parseFromString(text, "text/html");
  if (!doc) return;
  const nodes = doc?.querySelectorAll("div.result,c-container,new-pmd");
  if (!nodes) return;

  const results = [];
  for (const { childNodes } of nodes) {
    const el = childNodes[0].parentElement;

    const a = el?.querySelector("h3.t")?.querySelector("a");
    const title = a?.innerText.replace("_中公教育网", "");
    const url = a?.getAttribute(
      "href",
    );
    const content = el?.querySelector("div.c-abstract")?.innerText.replace(
      "_中公教育网",
      "",
    );

    if (title && content && url) {
      results.push({ title, content, url });
    }
  }

  return results;
}

async function detail(url: string): Promise<string> {
  const resp = await fetch(url);

  const text = await resp.text();
  const doc = new DOMParser().parseFromString(text, "text/html");
  if (!doc) return "解析错误";
  const title =
    doc.querySelector(".zg_Htitle")?.innerText?.replace("进入阅读模式", "") ?? "";
  const content = doc.querySelector("div.offcn_shocont")?.innerHTML;

  return `<a href=${url}>点击查看原网页</a><h2>${title}</h2><div>${content}<div>`;
}

function main() {
  const app = new Application();

  const port = Number(Deno.args[0]);

  app
    .get("/", () => {
      return HTML;
    })
    .post("/", async (c) => {
      const body = await c.body as { keyword: string };
      const results = await search(body.keyword);
      return results ? results : [];
    })
    .get("/detail", async (c) => {
      const url = c.queryParams.url as string;
      const content = await detail(decodeURIComponent(url));
      return `
<!DOCTYPE html>
<html lang="zh-cn">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>中共教育站内搜索</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.min.css"
    />
  </head>
  <body>
  ${content}
  </body>
</html>`;
    })
    .start({ port });

  console.log(`Listening on port ${port}`);
}

main();
