import fs from "fs/promises";
import path from "path";

type JSONValue = string | number | boolean | JSONObject | Array<JSONObject>;

interface JSONObject {
  [x: string]: JSONValue;
}

// Парсим файл в JSON
async function parseJsonFile(filePath: string): Promise<JSONObject> {
  const resolvedFilePath = path.resolve(__dirname, filePath);
  const fileBuffer = await fs.readFile(resolvedFilePath);
  return JSON.parse(fileBuffer.toString());
}

// Регулярка для проверки ссылки на компонент
const componentPathRegexp = /.\/(.*?)data.json/;

// Регулярка для проверки ссылки на изображения или другие ресурсы, путь до которых написан в Windows стиле
const windowsPathRegexp = /^[a-zA-Z]:\\[\\\S|*\S]?.*$/;

// Рекурсивно соединяем JSON по ссылкам
async function combineJson(json: JSONObject): Promise<JSONObject> {
  const result: JSONObject = {};

  for (const [key, value] of Object.entries(json)) {
    if (Array.isArray(value)) {
      const combinedPromiseArray = value.map((item) => combineJson(item));
      const combinedArray = await Promise.all(combinedPromiseArray);
      result[key] = combinedArray;
    } else if (typeof value === "string") {
      // Или можно использовать
      // entry.startsWith("./") && entry.endsWith("data.json")
      if (componentPathRegexp.test(value)) {
        const component = await parseJsonFile(value);
        const combinedComponent = await combineJson(component);
        result[key] = combinedComponent;
      } else if (windowsPathRegexp.test(value)) {
        const formattedPath = value.replaceAll(path.win32.sep, path.posix.sep);
        result[key] = formattedPath;
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

// Вывод результата
(async () => {
  try {
    const parsedPage = await parseJsonFile("page/page1.data.json");
    const combinedJson = await combineJson(parsedPage);
    console.log(JSON.stringify(combinedJson));

    // TODO: Как можно менять значения в глубоко вложенных ключах в итоговом объекте?

    // Первое, что приходит на ум: после сшивки у нас получается объект.
    // Мы можем напрямую обращаться к полям и менять их
    //
    // const foundItem = combinedJson.plugins.find((item) => item.name === "main");
    // if (foundItem) {
    //   foundItem.link.content = "Some content";
    // }
    //
    // Если унифицировать, то можно создать функцию, которая будет пробегаться по каждому вложенному объекту и на основе заданных условий манипулировать нужным
    // Реализуется либо с помощью рекурсии, либо с помощью стека
  } catch (err) {
    console.error(err);
  }
})();
