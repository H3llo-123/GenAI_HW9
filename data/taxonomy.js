// 分類清單（商圈、商圈代碼、料理類型、用餐情境、價位區間）
window.TAXONOMY = {
  districts: [
    {
      code: "wenshan",
      name: "文山區",
      zones: [
        { code: "nccu", name: "政大商圈" },
        { code: "muzha", name: "木柵" }
      ]
    }
  ],
  cuisines: [
    "傳統小吃",
    "便當",
    "健康餐",
    "速食",
    "咖啡廳",
    "早午餐"
  ],
  scenarios: [
    "一人食",
    "朋友聚餐",
    "約會",
    "學生預算",
    "宵夜"
  ],
  priceBands: [
    { code: "120以下", tier: "$", label: "120元以下 ($)" },
    { code: "121-300", tier: "$$", label: "121-300元 ($$)" },
    { code: "300以上", tier: "$$$", label: "300元以上 ($$$)" }
  ]
};
