Object.assign(ANIME_COPY.zh, {
  heroEyebrow: '04 / 光影留存',
  heroCaption: '过去，不过是我们讲给自己的故事。',
  heroBody: '——《她》 / Samantha',
  enterArchive: '翻开这一册',
  scroll: '继续往下',
  letterTitle: '光影\n札记',

  seriesKicker: '世界',
  seriesTitle: '这个世界很残酷……却也很美丽。',
  seriesBody: '——《进击的巨人》 / 三笠·阿克曼',

  charactersKicker: '人物',
  charactersTitle: '所谓悲伤，不正是爱仍在延续吗？',
  charactersBody: '——《旺达幻视》 / Vision',

  scenesKicker: '一瞬',
  scenesTitle: '所有这些瞬间，终将消逝在时间里……就像雨中的泪水。',
  scenesBody: '——《银翼杀手》 / Roy Batty',

  soundKicker: '余音',
  soundTitle: '歌唱真好。歌声可以滋润心灵。',
  soundBody: '——《新世纪福音战士》 / 渚薰',

  recentKicker: '近来 /《指环王：护戒使者》',
  recentTitle: '我们真正能决定的，只有如何度过被给予的时间。',

  emptyLabel: 'TO BE CONTINUED',
  emptySeriesTitle: '未完待续。',
  emptySeriesBody: '第一部系列尚未收录。',
  emptyCharactersTitle: '未完待续。',
  emptyCharactersBody: '人物会随对应系列一起出现。',
  emptyScenesTitle: '未完待续。',
  emptyScenesBody: '值得留下的一瞬，会从这里开始。',
  emptySoundTitle: '未完待续。',
  emptySoundBody: '第一段声音尚未收录。',
  emptyRecentTitle: '未完待续。',
  emptyRecentBody: '下一次观看会在这里留下日期。',

  seriesOpen: '进入这个世界',
  characterOpen: '去见这个人',
  sceneOpen: '回到这一瞬'
});

Object.assign(ANIME_COPY.en, {
  heroEyebrow: '04 / FRAMES REMAIN',
  heroCaption: 'The past is just a story we tell ourselves.',
  heroBody: '— Her / Samantha',
  enterArchive: 'OPEN THIS VOLUME',
  scroll: 'KEEP READING',
  letterTitle: 'Frames\nRemain',

  seriesKicker: 'WORLDS',
  seriesTitle: 'This world is cruel... But it’s also very beautiful.',
  seriesBody: '— Attack on Titan / Mikasa Ackermann',

  charactersKicker: 'CHARACTERS',
  charactersTitle: 'What is grief, if not love persevering?',
  charactersBody: '— WandaVision / Vision',

  scenesKicker: 'MOMENTS',
  scenesTitle: 'All those moments will be lost in time... like tears in rain...',
  scenesBody: '— Blade Runner / Roy Batty',

  soundKicker: 'ECHOES',
  soundTitle: 'Singing is great. Singing enriches the soul.',
  soundBody: '— Neon Genesis Evangelion / Kaworu Nagisa',

  recentKicker: 'RECENT / THE FELLOWSHIP OF THE RING',
  recentTitle: 'All we have to decide is what to do with the time that is given to us.',

  emptyLabel: 'TO BE CONTINUED',
  emptySeriesTitle: 'To be continued.',
  emptySeriesBody: 'The first series has not been entered yet.',
  emptyCharactersTitle: 'To be continued.',
  emptyCharactersBody: 'Characters will arrive with the series they belong to.',
  emptyScenesTitle: 'To be continued.',
  emptyScenesBody: 'The first moment worth keeping will begin here.',
  emptySoundTitle: 'To be continued.',
  emptySoundBody: 'The first sound has not been entered yet.',
  emptyRecentTitle: 'To be continued.',
  emptyRecentBody: 'The next watch will leave a date here.',

  seriesOpen: 'ENTER THIS WORLD',
  characterOpen: 'MEET THIS CHARACTER',
  sceneOpen: 'RETURN TO THIS MOMENT'
});

// Chinese lines are concise site translations of the sourced screen dialogue.
// anime.js may still be waiting for the catalog request. Applying once here makes
// the static copy correct immediately; its later render uses the same overridden copy.
applyAnimeLanguage();
