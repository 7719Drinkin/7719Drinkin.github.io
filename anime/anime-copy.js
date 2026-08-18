Object.assign(ANIME_COPY.zh, {
  heroEyebrow: '04 / 光影留存',
  heroCaption: '有些事一旦发生，就不会忘记。即使想不起来。',
  heroBody: '——《千与千寻》 / 钱婆婆',
  enterArchive: '翻开这一册',
  scroll: '继续往下',
  letterTitle: '光影\n札记',

  seriesKicker: '世界',
  seriesTitle: '珍惜这段经历吧。梦醒之后，梦会渐渐褪色。',
  seriesBody: '——《你的名字。》 / 宫水一叶',

  charactersKicker: '人物',
  charactersTitle: '我要去确认，我是否真的活着。',
  charactersBody: '——《星际牛仔》 / Spike Spiegel',

  scenesKicker: '一瞬',
  scenesTitle: '美好的事物，从不需要引人注目。',
  scenesBody: '——《白日梦想家》 / Sean O’Connell',

  soundKicker: '余音',
  soundTitle: '音乐就在我们身边，你只需要去听。',
  soundBody: '——《八月迷情》 / August Rush',

  recentKicker: '近来 /《重庆森林》',
  recentTitle: '如果记忆可以罐装，它会不会也有保质期？如果会，我希望是几百年。',

  emptyLabel: '引句',
  emptySeriesTitle: '不管最后做什么，都要热爱它。',
  emptySeriesBody: '——《天堂电影院》 / Alfredo',
  emptyCharactersTitle: '从现在开始，你可以改变。',
  emptyCharactersBody: '——《声之形》 / 西宫硝子',
  emptyScenesTitle: '那个时代已经过去，属于那个时代的一切都不存在了。',
  emptyScenesBody: '——《花样年华》',
  emptySoundTitle: '真正的音乐，会选择你。',
  emptySoundBody: '——《几近成名》 / Lester Bangs',
  emptyRecentTitle: '不管发生什么，就让它发生。',
  emptyRecentBody: '——《星际牛仔》 / Spike Spiegel',

  seriesOpen: '进入这个世界',
  characterOpen: '去见这个人',
  sceneOpen: '回到这一瞬'
});

Object.assign(ANIME_COPY.en, {
  heroEyebrow: '04 / FRAMES REMAIN',
  heroCaption: 'Once you do something, you never forget. Even if you can’t remember.',
  heroBody: '— Spirited Away / Zeniba',
  enterArchive: 'OPEN THIS VOLUME',
  scroll: 'KEEP READING',
  letterTitle: 'Frames\nRemain',

  seriesKicker: 'WORLDS',
  seriesTitle: 'Treasure the experience. Dreams fade away after you wake up.',
  seriesBody: '— Your Name. / Hitoha Miyamizu',

  charactersKicker: 'CHARACTERS',
  charactersTitle: 'I’m going to find out if I’m really alive.',
  charactersBody: '— Cowboy Bebop / Spike Spiegel',

  scenesKicker: 'MOMENTS',
  scenesTitle: 'Beautiful things don’t ask for attention.',
  scenesBody: '— The Secret Life of Walter Mitty / Sean O’Connell',

  soundKicker: 'ECHOES',
  soundTitle: 'The music is all around us, all you have to do is listen.',
  soundBody: '— August Rush',

  recentKicker: 'RECENT / CHUNGKING EXPRESS',
  recentTitle: 'If memories could be canned, would they also have expiry dates? If so, I hope they last for centuries.',

  emptyLabel: 'FROM THE SCREEN',
  emptySeriesTitle: 'Whatever you end up doing, love it.',
  emptySeriesBody: '— Cinema Paradiso / Alfredo',
  emptyCharactersTitle: 'You can change from now on.',
  emptyCharactersBody: '— A Silent Voice / Shoko Nishimiya',
  emptyScenesTitle: 'That era has passed. Nothing that belonged to it exists anymore.',
  emptyScenesBody: '— In the Mood for Love',
  emptySoundTitle: 'Music, you know, true music — it chooses you.',
  emptySoundBody: '— Almost Famous / Lester Bangs',
  emptyRecentTitle: 'Whatever happens, happens.',
  emptyRecentBody: '— Cowboy Bebop / Spike Spiegel',

  seriesOpen: 'ENTER THIS WORLD',
  characterOpen: 'MEET THIS CHARACTER',
  sceneOpen: 'RETURN TO THIS MOMENT'
});

// Chinese lines are concise site translations of the sourced screen dialogue.
// anime.js may still be waiting for the catalog request. Applying once here makes
// the static copy correct immediately; its later render uses the same overridden copy.
applyAnimeLanguage();
