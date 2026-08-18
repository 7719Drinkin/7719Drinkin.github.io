Object.assign(ANIME_COPY.zh, {
  heroEyebrow: '04 / 光影留存',
  heroCaption: '有些世界，在屏幕暗下之后才真正留下来。',
  heroBody: '一个多停留一秒的眼神，一句多年后才听懂的话，一段前奏响起就能把人带回某个时候的旋律。这里收下的，是这些没有随着片尾一起结束的东西。',
  enterArchive: '翻开这一册',
  scroll: '继续往下',
  letterTitle: '光影\n札记',

  seriesKicker: '世界',
  seriesTitle: '有些故事结束了，有些没有。',
  seriesBody: '最后一集播完以后，仍会有几个世界离得很近。想再回去的时候，就从这里进去。',

  charactersKicker: '人物',
  charactersTitle: '故事散场以后，总有人还站在那里。',
  charactersBody: '一个眼神，一次选择，一段沉默。真正留下来的人物，很少需要完整介绍。',

  scenesKicker: '一瞬',
  scenesTitle: '几秒钟的画面，也可以记很多年。',
  scenesBody: '雨落下来，门被推开，有人回头，镜头忽然安静。重新看见那一帧，整个故事就会自己回来。',

  soundKicker: '余音',
  soundTitle: '画面暗下去，旋律还没有结束。',
  soundBody: 'OP、ED、配乐与插曲，有时比剧情更先唤回记忆。前奏一响，那个世界就又亮起来。',

  recentKicker: '近来',
  recentTitle: '最近，又回到了哪些世界。',

  emptyLabel: '待续',
  emptySeriesTitle: '这一册，还没有写下第一部作品。',
  emptySeriesBody: '先留一页空白。真正想留下的世界出现时，再从这里开始。',
  emptyCharactersTitle: '还没有谁先从故事里走出来。',
  emptyCharactersBody: '等第一批作品归档以后，这里会留下那些多年后仍能一眼认出的人。',
  emptyScenesTitle: '还没有哪一帧被单独留下。',
  emptyScenesBody: '有些瞬间要过很久才知道，原来自己一直记得。',
  emptySoundTitle: '这一页，还没有响起第一段旋律。',
  emptySoundBody: '等某个前奏再次把记忆拉回来，就从那里开始。',
  emptyRecentTitle: '最近的一页还是空白。',
  emptyRecentBody: '下一次重看、补完，或只是突然想起，会在这里留下日期。',

  seriesOpen: '进入这个世界',
  characterOpen: '去见这个人',
  sceneOpen: '回到这一瞬'
});

Object.assign(ANIME_COPY.en, {
  heroEyebrow: '04 / DRAWN WORLDS',
  heroCaption: 'Some worlds begin to stay only after the screen goes dark.',
  heroBody: 'A glance held for one extra second. A line that makes sense years later. A melody that brings an entire time of life back with its first few notes. This is where those things remain.',
  enterArchive: 'OPEN THIS VOLUME',
  scroll: 'KEEP READING',
  letterTitle: 'Frames\nRemain',

  seriesKicker: 'WORLDS',
  seriesTitle: 'SOME STORIES END. SOME DO NOT.',
  seriesBody: 'Long after the final episode, a few worlds still feel close enough to step back into. When it is time to return, begin here.',

  charactersKicker: 'CHARACTERS',
  charactersTitle: 'THE STORY ENDS. SOMEONE STAYS.',
  charactersBody: 'A look, a choice, a silence. The people who truly remain rarely need a complete introduction.',

  scenesKicker: 'MOMENTS',
  scenesTitle: 'A FEW SECONDS CAN LAST FOR YEARS.',
  scenesBody: 'Rain falls. A door opens. Someone turns around. The frame goes quiet. See it again and the whole story comes back on its own.',

  soundKicker: 'ECHOES',
  soundTitle: 'THE SCREEN GOES DARK. THE MUSIC DOES NOT.',
  soundBody: 'Openings, endings, scores and insert songs can summon a memory before the plot does. A few notes, and the world lights up again.',

  recentKicker: 'RECENT',
  recentTitle: 'WHERE HAVE I RETURNED LATELY?',

  emptyLabel: 'TO BE CONTINUED',
  emptySeriesTitle: 'The first story has not been written into this volume yet.',
  emptySeriesBody: 'Leave a page blank for now. When a world is truly worth keeping, it can begin here.',
  emptyCharactersTitle: 'No one has stepped out of the story yet.',
  emptyCharactersBody: 'Once the first series are archived, this page will keep the faces that remain recognizable years later.',
  emptyScenesTitle: 'No single frame has been kept yet.',
  emptyScenesBody: 'Sometimes it takes years to realize a moment never really left.',
  emptySoundTitle: 'The first melody has not entered this page yet.',
  emptySoundBody: 'When an opening note pulls a memory back without warning, begin there.',
  emptyRecentTitle: 'The latest page is still blank.',
  emptyRecentBody: 'The next rewatch, catch-up, or sudden return will leave a date here.',

  seriesOpen: 'ENTER THIS WORLD',
  characterOpen: 'MEET THIS CHARACTER',
  sceneOpen: 'RETURN TO THIS MOMENT'
});

// anime.js may still be waiting for the catalog request. Applying once here makes
// the static copy correct immediately; its later render uses the same overridden copy.
applyAnimeLanguage();
