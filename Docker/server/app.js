const express = require("express");
const https = require("https");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const db = require("./db.js");
const fsPromises = require("fs").promises;
const morgan = require("morgan");
const weather = require("./getWeatherData.js");

const session = require("express-session");
const bodyParser = require("body-parser");
const FileStore = require("session-file-store")(session);
const authRouter = require("./auth");
const authCheck = require("./authCheck.js");
const { createDynamicHTML } = require("./result.js");

dotenv.config({ path: path.join(__dirname, "Keys/.env") });

const options = {
  key: fs.readFileSync(path.join(__dirname, "Keys/localhost-key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "Keys/localhost.pem")),
};

const app = express();
const port = 8888;
// app.set("port", 8888);

app.use(
  morgan("dev"),
  express.static(path.join(__dirname, "public")),
  express.static(path.join(__dirname, "views")),
  bodyParser.urlencoded({ limit: "10mb", extended: true }),
  bodyParser.json({ limit: "10mb" })
);
app.use("/script", express.static(__dirname + "/public"));

app.use(
  session({
    secret: `${process.env.SESSION_KEY}`, // 비밀키
    resave: false,
    saveUninitialized: false,
    store: new FileStore({ reapInterval: 60 * 60 }), //세션 파일 삭제 주기
    cookie: {
      expires: 1000 * 60 * 60, //세션유지 1시간
      httpOnly: true,
    },
  })
);

const locArr = [
  [61, 129],
  [62, 129],
  [59, 128],
  [60, 128],
  [61, 128],
  [62, 128],
  [57, 127],
  [58, 127],
  [59, 127],
  [60, 127],
  [61, 127],
  [62, 127],
  [63, 127],
  [57, 126],
  [58, 126],
  [59, 126],
  [60, 126],
  [61, 126],
  [62, 126],
  [63, 126],
  [57, 125],
  [58, 125],
  [59, 125],
  [60, 125],
  [61, 125],
  [62, 125],
  [63, 125],
  [58, 124],
  [59, 124],
  [61, 124],
];

async function getWeatherDataAndRenderPage(filePath, res) {
  let gridData = [];

  try {
    for (let idx = 0; idx < 30; idx++) {
      const data = await weather.get6WeatherData(locArr[idx][0], locArr[idx][1]);
      gridData.push(data);
    }
    const fileContent = await fsPromises.readFile(filePath, "utf-8");
    const updateData = fileContent.replace(`{{gridData}}`, JSON.stringify(gridData));
    return res.send(updateData);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error getting data");
  }
}

// 인증 라우터
app.use("/auth", authRouter);

//첫페이지
app.get("/", (req, res) => {
  if (!authCheck.isOwner(req, res)) {
    // 로그인 안되어있으면 로그인 페이지로 이동시킴
    res.redirect("/auth/login");
    // return false;
    return;
  } else {
    // 로그인 되어있으면 메인 페이지로 이동시킴
    res.redirect("/main");
    // return false;
    return;
  }
});

// 메인 페이지
app.get("/main", async (req, res, next) => {
  try {
    if (!authCheck.isOwner(req, res)) {
      // 로그인 안되어있으면 로그인 페이지로 이동시킴
      res.redirect("/auth/login");
      // return false;
      return;
    }
    const filePath = path.join(__dirname, "views/map.html");
    await getWeatherDataAndRenderPage(filePath, res);
  } catch (error) {
    next(error);
  }
});

//마이페이지
app.get("/main/mypage", (req, res) => {
  const loggedInUsername = req.session.is_logined ? req.session.nickname : "Guest";
  const filePath = path.join(__dirname, "/views/mypage.html");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading file");
    } else {
      // 외부 HTML 파일 내부의 {loggedInUsername}을 실제 사용자명으로 대체하여 전송
      const modifiedData = data.replace(/{loggedInUsername}/g, loggedInUsername);
      res.send(modifiedData);
    }
  });
});

//북마크
app.get("/main/mypage/bookmark", async (req, res) => {
  const filePath = path.join(__dirname, "/views/bookmark.html");
  let Routes = {};
  res.send("aaaaaaaa");
  // try {
  //   Routes = await transport.getPublicTransport(126.9961, 37.5035, 126.96, 37.4946, 202307291200); //신반포역->정보관
  //   if (Routes.length < 1) {
  //     //경로없음
  //     res.send("경로없음");
  //   } else {
  //   }
  // } catch (error) {
  //   console.error(error);
  // }
  // let sRoutes = JSON.stringify(Routes[0]);
  // let mRoutes = sRoutes.replace(/"/g, "@@");
  // fs.readFile(filePath, "utf8", (err, data) => {
  //   if (err) {
  //     res.status(500).send("Error reading file");
  //   } else {
  //     // 외부 HTML 파일 내부의 {T#}을 대체하여 전송
  //     const modifiedData = data.replace(/{{R}}/g, mRoutes);
  //     res.send(modifiedData);
  //   }
  // });
});

//장소 검색
app.get("/main/POI", async (req, res) => {
  const filePath = path.join(__dirname, "/views/mainFunc.html");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading file");
    } else {
      res.send(data);
    }
  });
});

// 검색 결과
app.post("/main/POI/result", async (req, res, next) => {
  let resource = req.body;
  try {
    const html = await createDynamicHTML(resource);
    res.send(html);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).send("Internal Server Error");
  }
});

//뽀송타임
app.get("/main/POI/result/pposong", async (req, res, next) => {
  try {
    const filePath = path.join(__dirname, "/views/pposong.html");

    // const data = await fsPromises.readFile(path.join(__dirname, "/views/pposong.html"), "utf-8");
    // res.send(data);
    await getWeatherDataAndRenderPage(filePath, res);
  } catch (error) {
    next(error);
  }
});

// 2023.12.08 김건학
// pposong.html에서 보낸 도보 데이터 받기, db검색 후 파싱, pposong.html로 데이터 전송

// 2023.12.08 김건학
// pposong.html에서 보낸 도보 데이터 받기, db검색 후 파싱, pposong.html로 데이터 전송
// 한 time의 데이터만 받아오는 기존 방식을 4 time 데이터 모두 받게 수정

//2023.12.10 이경호
//전송데이터-수신데이터 오류 해결
app.post("/main/POI/result/pposong/cal", async (req, res) => {
  let receivedData = req.body.WalkData;
  let resultData = [];
  try {
    const connection = await db();
    for (const walkData of receivedData) {
      const sectionData = [];
      let sum_RN1 = 0;
      for (const section of walkData) {
        let [weatherData] = await query(
          "SELECT * FROM FORECAST WHERE TIME = ? AND X = ? AND Y =  ?",
          [section.basetime, section.X, section.Y]
        );
        const section_RN1 = (Number(weatherData[0].RN1) * section.sectiontime) / 60;
        sum_RN1 += section_RN1;
        sectionData.push({
          DATE: weatherData[0].DATE,
          REH: weatherData[0].REH,
          RN1: weatherData[0].RN1,
          T1H: weatherData[0].T1H,
          TIME: weatherData[0].TIME,
          WSD: weatherData[0].WSD,
          X: weatherData[0].X,
          Y: weatherData[0].Y,
          section_RN1: section_RN1.toString(),
        });
      }
      const WalkWeatherData = {
        sum_RN1: sum_RN1.toString(),
        walkData: sectionData,
      };
      resultData.push(WalkWeatherData);
    }
    connection.destroy();
  } catch (error) {
    console.error("pposong/cal 에러: " + error);
  }
  let strresult = JSON.stringify(resultData);
  res.send(strresult);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.send("이용에 불편을 드려 죄송합니다.");
});

https.createServer(options, app).listen(port, () => {
  console.log(`Server is running at https://localhost:${port}/`);
});
