Object.assign(ANIME_COPY.zh, {
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

  recentKicker: '近来',
  recentTitle: '我们真正能决定的，只有如何度过被给予的时间。',
  recentBody: '——《指环王：护戒使者》 / Gandalf',

  seriesOpen: '进入这个世界',
  characterOpen: '去见这个人',
  sceneOpen: '回到这一瞬'
});

Object.assign(ANIME_COPY.en, {
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

  recentKicker: 'RECENTLY',
  recentTitle: 'All we have to decide is what to do with the time that is given to us.',
  recentBody: '— The Lord of the Rings: The Fellowship of the Ring / Gandalf',

  seriesOpen: 'ENTER THIS WORLD',
  characterOpen: 'MEET THIS CHARACTER',
  sceneOpen: 'RETURN TO THIS MOMENT'
});

// No placeholder cards are rendered before real anime data is entered.
emptyState = () => '';

// Chinese lines are concise site translations of the sourced screen dialogue.
// anime.js may still be waiting for the catalog request. Applying once here makes
// the static copy correct immediately; its later render uses the same overridden copy.
applyAnimeLanguage();
