/* Game catalog: pure data. A new game is a new entry here that reuses an engine.
   Every string the app speaks lives in this file, under a key named `say` or in `lines`,
   so tools/phrases.mjs can find it and tools/build_voice.py can record it. */
window.CH_CATALOG = {
  lines: {
    yes: 'Yes!',
    tryAgain: 'Try again.',
    watchAgain: 'Oops! Watch again.',
    yourTurn: 'Your turn!',
    fillFirst: 'Fill every box first.',
    bump: 'Oops! You bumped into something.',
    listening: "I'm listening. Say a word!",
    timeUp: 'Time is almost up. Finish this game.',
    breakTime: 'Time for a break! Ask a grown-up to help.',
    praise: ['You did it!', 'Amazing work!', 'Super star!', 'Hooray! Well done!', 'Brilliant!'],
    keepGoing: ["Not quite. Let's try again.", 'Almost! Try once more.'],
    streak: 'Wow, a streak! Bonus points!'
  },

  units: {
    young: ['First steps', 'Little loops and rules', 'Talk to play'],
    older: ['Code moves', 'Logic and numbers', 'Talk to code']
  },

  games: [
    /* ---------- Ages 4–6 ---------- */
    { id: 'A1', tier: 'young', unit: 0, icon: '🥕', title: 'Bunny Hop', skill: 'Sequencing', engine: 'arrowPath',
      how: "Tap arrows to plan the bunny's hops, then press Go. Tap a planned arrow to remove it.",
      say: 'Help the bunny reach the carrot. Tap the arrows to make a path, then press go.',
      notes: ['Arrows move in screen directions (up is up).', 'The block lights up as it runs, so kids link each block to each hop.'],
      cfg: { max: 8, board: { w: 4, h: 4, start: [0, 3], goal: [3, 0], walls: [[1, 1], [2, 1], [1, 3]], wallIcon: '🪨', hero: '🐰', prize: '🥕' } } },

    { id: 'A9', tier: 'young', unit: 0, icon: '🥕', title: 'Bunny Hop 2', skill: 'Sequencing', engine: 'arrowPath',
      how: 'A longer path around more rocks. Plan every hop, then press Go.',
      say: 'More rocks this time! Plan a path to the carrot, then press go.',
      notes: ['Same engine as Bunny Hop, new data. This is how the deck grows to hundreds of cards.'],
      cfg: { max: 10, board: { w: 5, h: 5, start: [0, 4], goal: [4, 0], walls: [[1, 4], [1, 3], [2, 1], [3, 3], [4, 2]], wallIcon: '🪨', hero: '🐰', prize: '🥕' } } },

    { id: 'A6', tier: 'young', unit: 0, icon: '💃', title: 'Copy the Dance', skill: 'Remembering steps', engine: 'dance',
      how: "Press Watch to see the robot's dance, then tap the moves in the same order.",
      say: 'Watch the robot dance. Then tap the moves in the same order.',
      notes: ['A program is a list of steps in order. Replaying a dance is the same skill without arrows.'],
      cfg: { moves: [{ id: 'clap', e: '👏', say: 'Clap!' }, { id: 'wave', e: '👋', say: 'Wave!' }, { id: 'stomp', e: '🦶', say: 'Stomp!' }, { id: 'spin', e: '🌀', say: 'Spin!' }],
             rounds: [['clap', 'wave', 'clap'], ['stomp', 'spin', 'wave', 'stomp']] } },

    { id: 'A2', tier: 'young', unit: 0, icon: '🚂', title: 'Pattern Train', skill: 'Patterns', engine: 'pattern',
      how: 'Spot the pattern and pick the next train car. Three rounds.',
      say: 'What comes next on the train? Tap the right one.',
      notes: ['Patterns are the seed of loops: "red, blue, again".'],
      cfg: { rounds: [
        { seq: ['🔴', '🔵', '🔴', '🔵', '🔴'], ans: '🔵', opts: ['🟢', '🔵', '🔴'] },
        { seq: ['🐶', '🐶', '🐱', '🐶', '🐶'], ans: '🐱', opts: ['🐶', '🐰', '🐱'] },
        { seq: ['🍎', '🍌', '🍇', '🍎', '🍌'], ans: '🍇', opts: ['🍇', '🍎', '🍌'] } ] } },

    { id: 'A3', tier: 'young', unit: 0, icon: '🌻', title: 'Seed Steps', skill: 'Order of steps', engine: 'order',
      how: 'Put the picture cards in order: first, next, last. Tap a filled box to take a card back.',
      say: 'How do we grow a flower? Tap the pictures in the right order.',
      notes: ['An algorithm is a recipe. Everyday routines make that concrete.'],
      cfg: { steps: [{ e: '🕳️', say: 'Dig a hole.' }, { e: '🌰', say: 'Plant the seed.' }, { e: '💧', say: 'Water it.' }, { e: '🌻', say: 'The flower grows!' }], shuffle: [2, 3, 0, 1] } },

    { id: 'A4', tier: 'young', unit: 1, icon: '🐇', title: 'Hop Hop Hop', skill: 'First loops', engine: 'hopCards',
      how: 'Only 3 cards fit. Pick an arrow, then press + to make that card hop more times. The dots show how many hops.',
      say: 'The bunny has only three hop cards. Use the plus button to make a card hop more than once.',
      notes: ['A loop without the word: "this arrow, 3 times".'],
      cfg: { slots: 3, maxCount: 4, board: { w: 5, h: 5, start: [0, 4], goal: [4, 0], path: [[0, 4], [1, 4], [2, 4], [3, 4], [3, 3], [3, 2], [3, 1], [3, 0], [4, 0]], wallIcon: '🌷', hero: '🐰', prize: '🥕' } } },

    { id: 'A5', tier: 'young', unit: 1, icon: '🐻', title: 'Weather Bear', skill: 'If this, then that', engine: 'rules',
      how: 'Teach the bear a rule for each kind of weather, then press Go and watch the bear follow your rules.',
      say: 'Teach the bear what to wear. When it is sunny, rainy or snowy, what should the bear put on? Fill the boxes, then press go.',
      notes: ['The kid writes the rules, then the bear runs them.'],
      cfg: { conditions: [{ e: '☀️', name: 'sunny', answer: '🕶️' }, { e: '🌧️', name: 'rainy', answer: '☂️' }, { e: '❄️', name: 'snowy', answer: '🧣' }],
             items: [{ e: '☂️', say: 'Umbrella.' }, { e: '🧣', say: 'Scarf.' }, { e: '🕶️', say: 'Sunglasses.' }],
             playOrder: ['🌧️', '☀️', '❄️'], hero: '🐻' } },

    { id: 'A7', tier: 'young', unit: 1, icon: '📍', title: 'Where Will It Land?', skill: 'Reading code', engine: 'predict',
      how: 'Follow the arrows in your head, then tap the square where the bunny will stop. Three rounds.',
      say: 'Read the arrows. Where will the bunny stop? Tap that square.',
      notes: ['Predicting what code does before running it.'],
      cfg: { board: { w: 4, h: 4, start: [0, 3], hero: '🐰' },
             rounds: [{ p: ['R', 'R', 'U'], end: [2, 2] }, { p: ['U', 'U', 'U', 'R', 'R', 'D'], end: [2, 1] }, { p: ['R', 'U', 'R', 'U', 'R'], end: [3, 1] }] } },

    { id: 'A8', tier: 'young', unit: 2, icon: '🎤', title: 'Talk to Bunny', skill: 'Voice commands', engine: 'voiceMove',
      how: 'Tap the microphone and say up, down, left or right. The bunny hops right away. No microphone? Tap the words.',
      say: 'Tap the microphone and tell the bunny where to hop. Say up, down, left, or right.',
      notes: ['Each spoken word runs one command at once, so kids hear and see cause and effect.', 'Needs a browser with speech recognition (Chrome, Edge, Safari). Word buttons work everywhere.'],
      cfg: { board: { w: 4, h: 4, start: [0, 3], goal: [3, 0], path: [[0, 3], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [3, 0]], wallIcon: '🪨', hero: '🐰', prize: '🥕' },
             words: { U: { label: 'up', glyph: '↑', hear: ['up', 'app', 'op', 'hop up'] }, D: { label: 'down', glyph: '↓', hear: ['down', 'dawn', 'town'] },
                      L: { label: 'left', glyph: '←', hear: ['left', 'lift', 'laughed', 'lefty'] }, R: { label: 'right', glyph: '→', hear: ['right', 'write', 'rite', 'bright', 'alright', 'all right'] } } } },

    /* ---------- Ages 7–9 ---------- */
    { id: 'B1', tier: 'older', unit: 0, icon: '🔁', title: 'Loop Maze', skill: 'Loops', engine: 'codeGrid',
      how: 'Get the frog to the lily pad using at most 6 blocks. Add a Repeat block and fill it with arrows (tap a box to choose where arrows go).',
      say: 'Get the frog to the lily pad. You only have six blocks, so use a repeat block.',
      notes: ['10 single arrows would work, but only 6 blocks fit. Repeat 5 × (→ ↑) takes 3.'],
      cfg: { max: 6, loop: true, solution: { main: [{ loop: 5, body: ['R', 'U'] }] }, board: { w: 6, h: 6, start: [0, 5], goal: [5, 0], path: [[0, 5], [1, 5], [1, 4], [2, 4], [2, 3], [3, 3], [3, 2], [4, 2], [4, 1], [5, 1], [5, 0]], wallIcon: '🌿', hero: '🐸', prize: '🪷', bw: 340 } } },

    { id: 'B12', tier: 'older', unit: 0, icon: '🔁', title: 'Loop Maze 2', skill: 'Loops', engine: 'codeGrid',
      how: 'A new staircase with a longer step. At most 6 blocks.',
      say: 'A new staircase. Find the pattern, then repeat it.',
      notes: ['Same engine, new data. The repeating unit is three arrows (→ → ↑).'],
      cfg: { max: 6, loop: true, solution: { main: [{ loop: 3, body: ['R', 'R', 'U'] }] }, board: { w: 7, h: 4, start: [0, 3], goal: [6, 0], path: [[0, 3], [1, 3], [2, 3], [2, 2], [3, 2], [4, 2], [4, 1], [5, 1], [6, 1], [6, 0]], wallIcon: '🌿', hero: '🐸', prize: '🪷', bw: 400 } } },

    { id: 'B2', tier: 'older', unit: 0, icon: '🐞', title: 'Bug Hunt', skill: 'Debugging', engine: 'debug',
      how: "The robot's program has one wrong block. Run it, watch where it crashes, then tap a block to turn it.",
      say: 'This program has a bug. Run it, find the wrong block, and tap it to fix it.',
      notes: ['Reading code is a separate skill from writing it.'],
      cfg: { buggy: ['R', 'R', 'D', 'D', 'D', 'D', 'R', 'D'], board: { w: 5, h: 5, start: [0, 0], goal: [4, 4], path: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4]], wallIcon: '🧱', hero: '🤖', prize: '🔋' } } },

    { id: 'B4', tier: 'older', unit: 0, icon: '🏙️', title: 'Tower Counter', skill: 'Counting loops', engine: 'counter',
      how: 'The machine counts from START to STOP, jumping each time. At every count it builds a tower that tall. Fill the dotted outlines.',
      say: 'Set the counting machine so the towers fill the dotted outlines.',
      notes: ['A for loop without the name: the counter changes each pass and the body uses it.'],
      cfg: { levels: [[1, 2, 3, 4, 5], [2, 4, 6, 8], [5, 4, 3, 2, 1]], jumps: [1, 2, 3, -1, -2], start: { start: 1, stop: 3, jump: 1 } } },

    { id: 'B8', tier: 'older', unit: 0, icon: '⭐', title: 'Make-a-Block', skill: 'Functions', engine: 'codeGrid',
      how: "Jump three rocks using at most 9 blocks. Tap the green ⭐ My block box and add the jump's arrows once. Then tap ⭐ My block in the palette each time you want to jump: it goes into the main program.",
      say: 'Build your own star block for the jump over a rock, then use it again and again.',
      notes: ['A function is a named list of steps you can reuse. Without it, the shortest program is 10 blocks.'],
      cfg: { max: 9, func: true, solution: { fn: ['U', 'R', 'R', 'D'], main: ['*', 'R', '*', 'R', '*'] }, board: { w: 9, h: 2, start: [0, 1], goal: [8, 1], walls: [[1, 1], [4, 1], [7, 1]], wallIcon: '🪨', hero: '🦘', prize: '🏁', bw: 420 } } },

    { id: 'B10', tier: 'older', unit: 0, icon: '✏️', title: 'Draw Bot', skill: 'Drawing with code', engine: 'turtle',
      how: 'The robot draws as it moves. Trace the dotted shape exactly. ⬆ moves one dot forward, ↻ and ↺ turn on the spot.',
      say: 'Program the drawing robot to trace the dotted shape.',
      notes: ['Turning is relative to the robot: a step up from screen arrows.'],
      cfg: { n: 5, shapes: [{ start: [1, 3], dir: 0, sol: 'FFRFFRFFRFFR' }, { start: [0, 4], dir: 0, sol: 'FRFLFRFLFRFL' }] } },

    { id: 'B3', tier: 'older', unit: 1, icon: '🧺', title: 'Sorting Machine', skill: 'If / else', engine: 'sorter',
      how: 'Pick the condition that makes the machine sort correctly, then run it. Two puzzles.',
      say: 'Build a rule so the sorting machine puts every shape in the right basket.',
      notes: ['The skill is choosing which property matters (shape or colour).'],
      cfg: { items: [['star', 'red'], ['circle', 'blue'], ['star', 'yellow'], ['circle', 'red'], ['star', 'blue'], ['square', 'yellow'], ['square', 'blue']],
             goals: [{ text: 'Goal: every ⭐ star goes in the LEFT basket.', k: 'shape', v: 'star' }, { text: 'Goal: every blue shape goes in the LEFT basket.', k: 'color', v: 'blue' }] } },

    { id: 'B5', tier: 'older', unit: 1, icon: '🚪', title: 'Odd or Even Gate', skill: 'Logic rules', engine: 'parity',
      how: 'Pick which last digits make a number even. The gate checks only the last digit, even for 1001. Tap a digit to see it split into pairs.',
      say: 'Build a rule that sends every even number through the even door. Hint: you only need to look at the last digit.',
      notes: ['Even means "splits into pairs with none left over". The 10 numbers end in all 10 digits.'],
      cfg: { nums: [14, 27, 130, 9, 58, 203, 66, 1001, 52, 35] } },

    { id: 'B9', tier: 'older', unit: 1, icon: '🫙', title: 'Magic Jar', skill: 'Variables', engine: 'jar',
      how: 'The jar holds one number and the program changes it. Predict the number at the end, then watch it run.',
      say: 'Read the program. What number is in the jar at the end?',
      notes: ['A variable is a named box whose value changes. Wording follows Scratch.'],
      cfg: { rounds: [
        { lines: [['set', 3], ['add', 2], ['add', 2]], opts: [5, 7, 9] },
        { lines: [['set', 1], ['repeat', 3, [['add', 4]]]], opts: [5, 13, 12] },
        { lines: [['set', 10], ['add', -3], ['double']], opts: [20, 14, 7] } ] } },

    { id: 'B6', tier: 'older', unit: 1, icon: '🧮', title: 'Block Adder', skill: 'Place value', engine: 'adder',
      how: 'Run the adding recipe with the buttons, in the right order. A column can hold at most 9.',
      say: 'Add the numbers with blocks. Push the ones together first, trade ten ones for a ten, then push the tens.',
      notes: ['Column addition is an algorithm with a condition inside it. Wrong answers on offer are the common mistakes.'],
      cfg: { problems: [[23, 45], [27, 35], [48, 36]] } },

    { id: 'B7', tier: 'older', unit: 1, icon: '🪞', title: 'Mirror Numbers', skill: 'Palindromes', engine: 'mirror',
      how: 'A mirror number reads the same forwards and backwards, like 121. Round 1: find them all. Round 2: run the flip-and-add machine until it makes one.',
      say: 'A mirror number reads the same forwards and backwards. Find them, then use the flip and add machine.',
      notes: ['Flip-and-add is a "repeat until" loop. The kid decides when to stop.'],
      cfg: { tiles: [121, 123, 44, 1221, 908, 7, 3443, 56], starts: [57, 68] } },

    { id: 'B11', tier: 'older', unit: 2, icon: '📻', title: 'Robot Radio', skill: 'Voice coding', engine: 'voiceCode',
      how: 'Tap the microphone and build the program by voice: forward, left, right. Say go to run it, undo to remove the last block. No microphone? Tap the words.',
      say: 'Talk to the robot. Say forward, left, or right to add blocks. Say go to run your program.',
      notes: ['Left and right turn the robot on the spot, relative to where it faces (the red arrow).', 'Speaking builds a program first, then go runs it, unlike Talk to Bunny which moves at once.'],
      cfg: { board: { w: 5, h: 5, start: [0, 4], goal: [4, 0], heading: 0, path: [[0, 4], [0, 3], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [3, 0], [4, 0]], wallIcon: '🧱', hero: '🤖', prize: '🔋' },
             words: { F: { label: 'forward', glyph: '⬆', hear: ['go forward', 'move forward', 'forward', 'forwards', 'straight', 'for word', 'four word'] },
                      LT: { label: 'left', glyph: '↺', hear: ['turn left', 'left', 'lift'] },
                      RT: { label: 'right', glyph: '↻', hear: ['turn right', 'right', 'write', 'rite', 'all right', 'alright'] },
                      GO: { label: 'go', glyph: '▶', hear: ['go', 'run', 'start', 'play'] },
                      UNDO: { label: 'undo', glyph: '⌫', hear: ['undo', 'oops', 'delete', 'back'] } } } }
  ]
};
