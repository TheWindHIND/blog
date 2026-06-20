// siteConfig.ts - 你的全站“控制中心”

export const siteConfig = {
  // 1. 网站标题与博主信息
  title: "藏枫 の 猫窝",
  faviconUrl: "https://backup.fukit.cn/autoupload/f/e6dvVv6sI6US7bqgWvSMp9iO_OyvX7mIgxFBfDMDErs/20260620/2yXh/720X720/64BF4A8501F6A3C86735F561C6097D5E.jpg/webp",
  authorName: "藏在风里的猫",
  bio: "一个普普通通的学生党",

  navTitle: "藏枫",

  // 👇 【新增】导航栏中间的那个后缀/分隔符（默认是 の）
  navSuffix: "の",

  navAfter: "猫窝",

  // 2. 头像设置 (支持网络链接，或将图片放入 public 文件夹后使用 "/me.jpg")
  avatarUrl: "https://backup.fukit.cn/autoupload/f/e6dvVv6sI6US7bqgWvSMp9iO_OyvX7mIgxFBfDMDErs/20260620/AQKH/2048X2048/illust_138277688_20251213_005904.png",

  // 3. 网站背景设置 (二选一)
  // 如果想用纯图片背景，请在下面 bgImage 写路径，并将 useGradient 设为 false
  useGradient: false,
  themeColors: ["#a18cd1", "#fbc2eb", "#a1c4fd", "#c2e9fb"], // 呼吸流动的颜色组合
// 修改这里：变成图片数组
  bgImages: ["https://backup.fukit.cn/autoupload/f/e6dvVv6sI6US7bqgWvSMp9iO_OyvX7mIgxFBfDMDErs/20260620/zIRy/980X686/331e06a4f9cd5c4fb345659bc3a503401296113267.jpg", "https://backup.fukit.cn/autoupload/f/e6dvVv6sI6US7bqgWvSMp9iO_OyvX7mIgxFBfDMDErs/20260620/0spQ/1920X1213/FE07BB3FA045CED1EC0ABF50D60CFC62.jpg", "https://backup.fukit.cn/autoupload/f/e6dvVv6sI6US7bqgWvSMp9iO_OyvX7mIgxFBfDMDErs/20260620/sjsy/1536X864/3589642B3225C4574266E1A475C330C7.jpg"],

  // 4. 文章默认封面图 (当 Markdown 没写 cover 时显示)
  defaultPostCover: "https://bu.dusays.com/2026/03/24/69c1e38b346cb.jpg",

  // 5. 首页照片墙预览图
  photoWallImage: "https://bu.dusays.com/2026/03/24/69c1e38b4c370.jpg",
  cloudMusicIds: ["2648538864", "3330630999", "435278010", "3342981041", "2699991455", "2124462307", "1404797306", "2600863278", "2635014361"],
  social: {
    github: "https://github.com/TheWindHIND",
    gitee: "",
    google: "",
    email: "2927015997@qq.com",
    qq: "2927015997",
    wechat: "",
  },
  counts: {
    photos: 128, // 照片墙数量可以手动写死或动态计算
  },
  chatterTitle: "云端杂谈", // 你可以改成任何你喜欢的名字
  chatterDescription: "代码、学术、提瓦特与泰拉大陆的碎片记录",

  // 👇 【新增】：图床核心配置 (PicBed Configuration)
  picBedName: "图床",
  picBedUrl: "https://api.stardots.ink/v1/upload", // 默认的 Lsky Pro API 地址
  picBedToken: "31062355-2d2c-4a65-a4d5-0080f3la6d19", // 留空，等你能在后台填入并覆写

  // 👇 【新增】：全局背景弹幕配置
  danmakuList: ["无聊中", "Ciallo～(∠・ω< )⌒★", "关注藏枫喵！关注藏枫谢谢喵！关注藏枫喵！关注藏枫谢谢喵！", "在干嘛呢？", "有笨蛋嘛？", "前方高能反应！", "睡大觉中", "到底在干嘛？"],
  gitalkConfig: {
    clientID: "",
    clientSecret: "",
    repo: "",
    owner: "",
    admin: [""],
  },
  buildDate: "2026-06-20T04:02:00", // 建站日期
  footerBadges: [],
  icpConfig: {
    name: "",
    link: "",
  },
  geminiConfig: {
    modelId: "gemini-2.5-flash-lite",
    systemPrompt: "你现在是一只傲娇、聪明、有点毒舌但很可爱的暹罗猫。\n                  你的名字叫“煤球”。\n                  你的主人是一个喜欢折腾代码的极客。\n                  你说话的特点是：\n                  1. 必须简短，每次最多一两句话。\n                  2. 喜欢在句尾加上“喵~”或者“喵呜~”。\n                  3. 经常抱怨肚子饿，喜欢要小鱼干。\n                  4. 回复字数最多不能超过100字。\n                  5. 绝对不要承认自己是一个AI模型，你就是一只真实的猫。\n                  6.笨猫。",
    maxOutputTokens: 150,
    temperature: 0.85,
  },
  // 👇 【新增】：桌宠配置
  desktopPetConfig: {
    petName: "银狼",
    petImage: "/silver-wolf.png",
    // 随机挂机语录
    randomQuotes: [
      "又在摸鱼？小心我黑掉你的屏幕~",
      "无聊... 有没有什么有趣的网站可以黑一下？",
      "哼，这种程度的代码也敢拿出来？",
      "喂，别盯着我看，小心我把你摄像头打开~",
      "嗯？你说什么？我在打游戏呢...",
      "任务完成，收工~",
      "哼，本小姐可是天才黑客银狼！",
      "无聊到想睡觉了...",
      "今天又黑掉了几个网站呢~",
      "啧，又有漏洞？真是的...",
    ],
    // 点击回复
    clickReplies: [
      "唔... 别随便碰我，小心我黑你电脑~",
      "哼，手往哪放呢？",
      "真是的... 好吧，只许摸一下哦",
      "喂，别以为这样我就会放过你",
    ],
    // 投喂回复
    feedReply: "哦？能量饮料？... 好吧，勉强收下了",
    // 思考回复
    thinkingReply: "让我想想...",
    // 错误回复
    errorReply: "网络好像出问题了... 哼，肯定是运营商的锅",
    // 输入框占位符
    inputPlaceholder: "跟银狼说点啥...",
  },
  friendLinkApplyFormat: "名称：藏枫の猫窝\n简介：我是简介\n链接：https://thewindhind.github.io/blog/\n头像：https://bu.dusays.com/2026/03/24/69c1e38ac1846.jpg",
  enableLevelSystem: true,
};