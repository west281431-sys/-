import React from "react";
import { ReelBase, ReelCfg, Title, Script, Pill, Flash, Chevrons } from "./core";

// Example: put your video into public/media/v1.mp4, words come from scripts/words.py
const cfg: ReelCfg = {
  src: "media/v1.mp4",
  speechEnd: 10,
  punch: [0.0, 3.3, 6.5],
  brand: { name: "Мой бренд" },
  words: [
    ["Ну", 0.0], ["что,", 0.3], ["|когда", 0.6], ["уже", 0.9], ["|начнём?", 1.2],
    ["|Новый", 3.3], ["год", 3.6], ["|прошёл,", 3.9], ["|*лето", 4.6], ["прошло", 4.9],
    ["|Самое", 6.5], ["время", 6.8], ["|*начать", 7.2], ["|жми", 8.4], ["*«Подробнее»", 8.7],
  ],
  sfx: [[0.0, "thud", 0.14], [3.3, "pop"], [4.6, "pop"], [6.4, "whoosh"], [8.4, "ding"]],
};

export const Example: React.FC = () => (
  <ReelBase cfg={cfg}>
    <Title from={0.0} to={3.2} text="Ну что, когда уже?" p={1} />
    <Script from={1.2} to={3.2} text="начнём наконец" p={1} />
    <Pill from={3.3} to={6.3} text="Новый год" x={300} y={1100} rotate={-6} strikeAt={3.9} />
    <Pill from={4.6} to={6.3} text="Лето" x={780} y={1180} rotate={5} strikeAt={4.9} />
    <Flash at={6.4} />
    <Title from={6.5} to={8.3} text="Самое время" p={3} />
    <Script from={7.2} to={8.3} text="начать" p={3} />
    <Title from={8.4} to={10} text="Жми «Подробнее»" p={5} />
    <Chevrons from={8.7} to={10} />
  </ReelBase>
);
