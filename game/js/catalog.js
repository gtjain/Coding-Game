/* Game catalog: pure data. A new game is a new entry here that reuses an engine.
   Every string the app speaks lives in this file, under a key named `say` or in `lines`,
   so tools/phrases.mjs can find it and tools/build_voice.py can record it. */
(function () {
/* Words used in spoken lines, written out so the voice reads them clearly. */
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const cap = w => w[0].toUpperCase() + w.slice(1);
const addSay = (a, b, thing) => `${cap(NUM[a])} ${thing} and ${NUM[b]} ${thing}. Tap the basket button to put them together. Then tap how many.`;
const subSay = (a, b, thing) => `${cap(NUM[a])} ${thing}. The monkey eats ${NUM[b]}. Tap eat. Then tap how many are left.`;
const rhymeSay = w => `Feed the monster words that rhyme with ${w}. Tap a picture to hear it.`;
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
    streak: 'Wow, a streak! Bonus points!',
    bugFound: 'Squish! You found the bug. Now tap the picture that fixes it.',
    flipTwo: 'Flip two cards. Find two that match.'
  },

  units: {
    young: ['First steps', 'Little loops and rules', 'Talk to play', 'Words and letters', 'Numbers', 'Bugs and memory'],
    older: ['Code moves', 'Logic and numbers', 'Talk to code', 'Words and lists', 'Luck, bugs and memory']
  },

  games: [
    /* ---------- Ages 4–6 ---------- */
    { id: 'A1', tier: 'young', unit: 0, icon: '🥕', title: 'Bunny Hop', skill: 'Sequencing', engine: 'arrowPath',
      goal: 'Help the bunny get the carrot.',
      steps: ['👆 Tap the arrows to plan the hops.', '▶ Press Go.'],
      say: 'Help the bunny get the carrot. Tap the arrows to plan the hops. Then press go.',
      notes: ['Arrows move in screen directions (up is up).', 'The block lights up as it runs, so kids link each block to each hop.'],
      cfg: { max: 8, board: { w: 4, h: 4, start: [0, 3], goal: [3, 0], walls: [[1, 1], [2, 1], [1, 3]], wallIcon: '🪨', hero: '🐰', prize: '🥕' } } },

    { id: 'A9', tier: 'young', unit: 0, icon: '🥕', title: 'Bunny Hop 2', skill: 'Sequencing', engine: 'arrowPath',
      goal: 'Hop around the rocks to the carrot.',
      steps: ['👆 Tap the arrows to plan the hops.', '▶ Press Go.'],
      say: 'Hop around the rocks to the carrot. Tap the arrows to plan the hops. Then press go.',
      notes: ['Same engine as Bunny Hop, new data. This is how the deck grows to hundreds of cards.'],
      cfg: { max: 10, board: { w: 5, h: 5, start: [0, 4], goal: [4, 0], walls: [[1, 4], [1, 3], [2, 1], [3, 3], [4, 2]], wallIcon: '🪨', hero: '🐰', prize: '🥕' } } },

    { id: 'A6', tier: 'young', unit: 0, icon: '💃', title: 'Copy the Dance', skill: 'Remembering steps', engine: 'dance',
      goal: 'Copy the robot\'s dance.',
      steps: ['👀 Press Watch. The robot dances.', '👆 Tap the same moves in the same order.'],
      say: 'Copy the robot\'s dance. Press watch. Then tap the same moves in the same order.',
      notes: ['A program is a list of steps in order. Replaying a dance is the same skill without arrows.'],
      cfg: { moves: [{ id: 'clap', e: '👏', say: 'Clap!' }, { id: 'wave', e: '👋', say: 'Wave!' }, { id: 'stomp', e: '🦶', say: 'Stomp!' }, { id: 'spin', e: '🌀', say: 'Spin!' }],
             rounds: [['clap', 'wave', 'clap'], ['stomp', 'spin', 'wave', 'stomp']] } },

    { id: 'A2', tier: 'young', unit: 0, icon: '🚂', title: 'Pattern Train', skill: 'Patterns', engine: 'pattern',
      goal: 'Find the missing car.',
      steps: ['👀 Look at the train. Find the pattern.', '👆 Tap the car that comes next.'],
      say: 'Find the missing car. Look at the train. Then tap the car that comes next.',
      notes: ['Patterns are the seed of loops: "red, blue, again".'],
      cfg: { rounds: [
        { seq: ['🔴', '🔵', '🔴', '🔵', '🔴'], ans: '🔵', opts: ['🟢', '🔵', '🔴'] },
        { seq: ['🐶', '🐶', '🐱', '🐶', '🐶'], ans: '🐱', opts: ['🐶', '🐰', '🐱'] },
        { seq: ['🍎', '🍌', '🍇', '🍎', '🍌'], ans: '🍇', opts: ['🍇', '🍎', '🍌'] } ] } },

    { id: 'A3', tier: 'young', unit: 0, icon: '🌻', title: 'Seed Steps', skill: 'Order of steps', engine: 'order',
      goal: 'Grow a flower.',
      steps: ['👆 Tap the picture that happens first.', '👆 Then tap the next one, and the next.', 'Wrong box? Tap it to take the card back.'],
      say: 'Grow a flower. Tap the picture that happens first. Then tap the next one, and the next.',
      notes: ['An algorithm is a recipe. Everyday routines make that concrete.'],
      cfg: { steps: [{ e: '🕳️', say: 'Dig a hole.' }, { e: '🌰', say: 'Plant the seed.' }, { e: '💧', say: 'Water it.' }, { e: '🌻', say: 'The flower grows!' }], shuffle: [2, 3, 0, 1] } },

    { id: 'A4', tier: 'young', unit: 1, icon: '🐇', title: 'Hop Hop Hop', skill: 'First loops', engine: 'hopCards',
      goal: 'Get the carrot with only three cards.',
      steps: ['👆 Tap an arrow to add a card.', '➕ Tap plus to hop more times. The dots count the hops.', '▶ Press Go.'],
      say: 'Get the carrot with only three cards. Tap an arrow. Tap plus to hop more times. Then press go.',
      notes: ['A loop without the word: "this arrow, 3 times".'],
      cfg: { slots: 3, maxCount: 4, board: { w: 5, h: 5, start: [0, 4], goal: [4, 0], path: [[0, 4], [1, 4], [2, 4], [3, 4], [3, 3], [3, 2], [3, 1], [3, 0], [4, 0]], wallIcon: '🌷', hero: '🐰', prize: '🥕' } } },

    { id: 'A5', tier: 'young', unit: 1, icon: '🐻', title: 'Weather Bear', skill: 'If this, then that', engine: 'rules',
      goal: 'Dress the bear for the weather.',
      steps: ['👆 Tap a weather box.', '👆 Tap what the bear should wear.', '▶ Press Go.'],
      say: 'Dress the bear for the weather. Tap a weather box. Tap what the bear should wear. Then press go.',
      notes: ['The kid writes the rules, then the bear runs them.'],
      cfg: { conditions: [{ e: '☀️', name: 'sunny', answer: '🕶️' }, { e: '🌧️', name: 'rainy', answer: '☂️' }, { e: '❄️', name: 'snowy', answer: '🧣' }],
             items: [{ e: '☂️', say: 'Umbrella.' }, { e: '🧣', say: 'Scarf.' }, { e: '🕶️', say: 'Sunglasses.' }],
             playOrder: ['🌧️', '☀️', '❄️'], hero: '🐻' } },

    { id: 'A7', tier: 'young', unit: 1, icon: '📍', title: 'Where Will It Land?', skill: 'Reading code', engine: 'predict',
      goal: 'Guess where the bunny will stop.',
      steps: ['👀 Read the arrows, one at a time.', '👆 Tap the square where the bunny stops.'],
      say: 'Guess where the bunny will stop. Read the arrows one at a time. Then tap the square.',
      notes: ['Predicting what code does before running it.'],
      cfg: { board: { w: 4, h: 4, start: [0, 3], hero: '🐰' },
             rounds: [{ p: ['R', 'R', 'U'], end: [2, 2] }, { p: ['U', 'U', 'U', 'R', 'R', 'D'], end: [2, 1] }, { p: ['R', 'U', 'R', 'U', 'R'], end: [3, 1] }] } },

    { id: 'A8', tier: 'young', unit: 2, icon: '🎤', title: 'Talk to Bunny', skill: 'Voice commands', engine: 'voiceMove',
      goal: 'Tell the bunny how to get the carrot.',
      steps: ['🎤 Tap the microphone.', '🗣️ Say up, down, left or right.', '👆 No microphone? Tap a word.'],
      say: 'Tell the bunny how to get the carrot. Tap the microphone. Then say up, down, left, or right.',
      notes: ['Each spoken word runs one command at once, so kids hear and see cause and effect.', 'Needs a browser with speech recognition (Chrome, Edge, Safari). Word buttons work everywhere.'],
      cfg: { board: { w: 4, h: 4, start: [0, 3], goal: [3, 0], path: [[0, 3], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [3, 0]], wallIcon: '🪨', hero: '🐰', prize: '🥕' },
             words: { U: { label: 'up', glyph: '↑', hear: ['up', 'app', 'op', 'hop up'] }, D: { label: 'down', glyph: '↓', hear: ['down', 'dawn', 'town'] },
                      L: { label: 'left', glyph: '←', hear: ['left', 'lift', 'laughed', 'lefty'] }, R: { label: 'right', glyph: '→', hear: ['right', 'write', 'rite', 'bright', 'alright', 'all right'] } } } },

    /* ---------- Ages 4–6: words, numbers, bugs and memory ---------- */
    { id: 'A11', tier: 'young', unit: 3, icon: '🔤', title: 'Letter Spotter', skill: 'Counting letters', engine: 'letterTap',
      goal: 'Find every one of a letter in a word.',
      steps: ['👀 Look at the letter in the bubble.', '👆 Tap every matching letter in the word.', '🔢 The number counts how many you found.'],
      say: 'Find every one of a letter in a word. Look at the letter in the bubble. Tap every matching letter in the word.',
      notes: ['Counting matching items in a list is the first step of searching and counting in code.'],
      cfg: { rounds: [
        { word: 'apple', letter: 'p', say: 'Find every pee in apple.' },
        { word: 'banana', letter: 'a', say: 'Find every ay in banana.' },
        { word: 'strawberry', letter: 'r', say: 'Find every ar in strawberry.' } ] } },

    { id: 'A12', tier: 'young', unit: 3, icon: '🧩', title: 'Word Glue', skill: 'Joining words', engine: 'glue',
      goal: 'Glue two words together to make a new word.',
      steps: ['👀 Look at the picture. It shows the new word.', '👆 Tap the words in the right order.', '✨ They glue together!'],
      say: 'Glue two words together to make a new word. Look at the picture. Then tap the words in the right order.',
      notes: ['Joining words is called concatenation. Order matters: sunflower is not flowersun.'],
      cfg: { say: ['sun', 'flower', 'shine', 'sunflower', 'rain', 'bow', 'drop', 'rainbow', 'cup', 'cake', 'pan', 'cupcake'],
        rounds: [
          { pic: '🌻', word: 'sunflower', parts: ['sun', 'flower'], tiles: ['flower', 'shine', 'sun'], say: 'Make sunflower. Which word comes first?' },
          { pic: '🌈', word: 'rainbow', parts: ['rain', 'bow'], tiles: ['drop', 'bow', 'rain'], say: 'Make rainbow. Tap the words in order.' },
          { pic: '🧁', word: 'cupcake', parts: ['cup', 'cake'], tiles: ['cake', 'pan', 'cup'], say: 'Make cupcake. Tap the words in order.' } ] } },

    { id: 'A16', tier: 'young', unit: 3, icon: '👾', title: 'Rhyme Monster', skill: 'Rhyming words', engine: 'rhyme',
      goal: 'Feed the monster words that rhyme.',
      steps: ['👂 Tap a picture to hear its word.', '👾 Words that rhyme with the monster word taste yummy!', '👆 Feed the monster every rhyme.'],
      say: 'Feed the monster words that rhyme. Tap a picture to hear its word. If it rhymes, the monster eats it.',
      notes: ['Rhyming is matching patterns in sound, like matching patterns in code.'],
      cfg: { say: ['cat', 'hat', 'bat', 'rat', 'dog', 'sun', 'cup', 'bee', 'tree', 'key', 'sea', 'bed', 'hand', 'moon', 'spoon', 'balloon', 'raccoon', 'star', 'car'],
        rounds: [
          { target: { e: '🐱', w: 'cat' }, say: rhymeSay('cat'), items: [{ e: '🎩', w: 'hat', r: 1 }, { e: '🐶', w: 'dog' }, { e: '🦇', w: 'bat', r: 1 }, { e: '🌞', w: 'sun' }, { e: '🐀', w: 'rat', r: 1 }, { e: '🥤', w: 'cup' }] },
          { target: { e: '🐝', w: 'bee' }, say: rhymeSay('bee'), items: [{ e: '🌳', w: 'tree', r: 1 }, { e: '🛏️', w: 'bed' }, { e: '🔑', w: 'key', r: 1 }, { e: '✋', w: 'hand' }, { e: '🌊', w: 'sea', r: 1 }, { e: '🐱', w: 'cat' }] },
          { target: { e: '🌙', w: 'moon' }, say: rhymeSay('moon'), items: [{ e: '🥄', w: 'spoon', r: 1 }, { e: '⭐', w: 'star' }, { e: '🎈', w: 'balloon', r: 1 }, { e: '🚗', w: 'car' }, { e: '🦝', w: 'raccoon', r: 1 }, { e: '🐶', w: 'dog' }] } ] } },

    { id: 'A13', tier: 'young', unit: 4, icon: '🧺', title: 'Apple Basket', skill: 'Adding', engine: 'sums',
      goal: 'Put apples together. How many in all?',
      steps: ['👀 Count the apples in each group.', '🧺 Tap the basket button to put them together.', '👆 Tap how many there are now.'],
      say: 'Put the apples together. How many in all? Tap the basket button. Then tap the number.',
      notes: ['Addition means putting groups together. Seeing the objects join makes the plus sign concrete.'],
      cfg: { op: '+', e: '🍎', rounds: [{ a: 2, b: 3, say: addSay(2, 3, 'apples') }, { a: 4, b: 2, say: addSay(4, 2, 'apples') }, { a: 5, b: 4, say: addSay(5, 4, 'apples') }] } },

    { id: 'A14', tier: 'young', unit: 4, icon: '🐵', title: 'Monkey Snack', skill: 'Taking away', engine: 'sums',
      goal: 'The monkey eats some bananas. How many are left?',
      steps: ['👀 Count the bananas.', '🐵 Tap Eat. The monkey eats some.', '👆 Tap how many are left.'],
      say: 'The monkey eats some bananas. How many are left? Tap eat. Then tap the number.',
      notes: ['Subtraction means taking away. Watching items disappear shows what minus does.'],
      cfg: { op: '-', e: '🍌', eater: '🐵', rounds: [{ a: 5, b: 2, say: subSay(5, 2, 'bananas') }, { a: 6, b: 4, say: subSay(6, 4, 'bananas') }, { a: 8, b: 3, say: subSay(8, 3, 'bananas') }] } },

    { id: 'A10', tier: 'young', unit: 5, icon: '🐛', title: 'Squish the Bug', skill: 'What is a bug?', engine: 'bugSteps',
      goal: "Find the bug in the robot's steps.",
      steps: ['👀 Look at the steps the robot does.', '🐛 A bug is a step that does not belong. Tap it!', '👆 Then tap the picture that fixes it.'],
      say: "Find the bug in the robot's steps. A bug is a mistake. Tap the step that does not belong. Then tap the picture that fixes it.",
      notes: ['A bug is a mistake in a program. Finding it and fixing it is called debugging.'],
      cfg: { rounds: [
          { title: 'Make a sandwich', steps: ['🍞', '🧀', '👟', '🍞'], bug: 2, fix: '🥬', opts: ['🥬', '🚗', '🧸'], say: 'Robo makes a sandwich. One step is a bug. Tap the step that does not belong.' },
          { title: 'Grow a flower', steps: ['🌱', '🔥', '💧', '🌻'], bug: 1, fix: '☀️', opts: ['🍕', '☀️', '🚗'], say: 'Robo grows a flower. Find the bug and tap it.' },
          { title: 'Draw a face', steps: ['👀', '👃', '👄', '👟'], bug: 3, fix: '👂', opts: ['👂', '🚗', '🍕'], say: 'Robo draws a face. Which step is the bug?' } ] } },

    { id: 'A15', tier: 'young', unit: 5, icon: '🧠', title: 'Memory Match', skill: 'Memory', engine: 'matchPairs',
      goal: 'Find the matching pairs. Remember where they hide!',
      steps: ['👆 Tap a card to flip it.', '👆 Tap a second card. Do they match?', '🧠 Remember where each picture is. Match them all!'],
      say: 'Find the matching pairs. Tap a card to flip it. Then tap a second card. Remember where each picture hides.',
      notes: ['Computers have memory too. They keep things so they can find them later.', 'Stars: 3 for up to 3 wrong flips, 2 for up to 6.'],
      cfg: { pairs: ['🐶', '🐱', '🐰', '🐸'], cols: 4, stars: [3, 6], helpAfter: 6 } },

    /* ---------- Ages 7–9 ---------- */
    { id: 'B1', tier: 'older', unit: 0, icon: '🔁', title: 'Loop Maze', skill: 'Loops', engine: 'codeGrid',
      goal: 'Get the frog to the lily pad.',
      steps: ['🔁 Tap Repeat to start a loop.', '👆 Tap arrows to put them inside the loop.', '▶ Press Run. You only have 6 blocks.'],
      say: 'Get the frog to the lily pad. You only have six blocks, so use a repeat loop. Then press run.',
      notes: ['10 single arrows would work, but only 6 blocks fit. Repeat 5 × (→ ↑) takes 3.'],
      cfg: { max: 6, loop: true, solution: { main: [{ loop: 5, body: ['R', 'U'] }] }, board: { w: 6, h: 6, start: [0, 5], goal: [5, 0], path: [[0, 5], [1, 5], [1, 4], [2, 4], [2, 3], [3, 3], [3, 2], [4, 2], [4, 1], [5, 1], [5, 0]], wallIcon: '🌿', hero: '🐸', prize: '🪷', bw: 340 } } },

    { id: 'B12', tier: 'older', unit: 0, icon: '🔁', title: 'Loop Maze 2', skill: 'Loops', engine: 'codeGrid',
      goal: 'Get the frog up the new staircase.',
      steps: ['🔁 Tap Repeat to start a loop.', '👆 Tap arrows to put them inside the loop.', '▶ Press Run. You only have 6 blocks.'],
      say: 'Get the frog up the new staircase. Find the pattern and repeat it. You only have six blocks.',
      notes: ['Same engine, new data. The repeating unit is three arrows (→ → ↑).'],
      cfg: { max: 6, loop: true, solution: { main: [{ loop: 3, body: ['R', 'R', 'U'] }] }, board: { w: 7, h: 4, start: [0, 3], goal: [6, 0], path: [[0, 3], [1, 3], [2, 3], [2, 2], [3, 2], [4, 2], [4, 1], [5, 1], [6, 1], [6, 0]], wallIcon: '🌿', hero: '🐸', prize: '🪷', bw: 400 } } },

    { id: 'B2', tier: 'older', unit: 0, icon: '🐞', title: 'Bug Hunt', skill: 'Debugging', engine: 'debug',
      goal: 'Fix the robot\'s program.',
      steps: ['▶ Press Run. Watch where the robot crashes.', '🔴 The red block is where it crashed.', '👆 Tap a wrong block to turn it. Then run again.'],
      say: 'Fix the robot\'s program. Press run and watch where it crashes. Then tap a wrong block to turn it.',
      notes: ['Reading code is a separate skill from writing it.'],
      cfg: { buggy: ['R', 'R', 'D', 'D', 'D', 'D', 'R', 'D'], board: { w: 5, h: 5, start: [0, 0], goal: [4, 4], path: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4]], wallIcon: '🧱', hero: '🤖', prize: '🔋' } } },

    { id: 'B4', tier: 'older', unit: 0, icon: '🏙️', title: 'Tower Counter', skill: 'Counting loops', engine: 'counter',
      goal: 'Build towers that match the dotted outlines.',
      steps: ['⚙️ Set START, STOP and JUMP.', '▶ Press Count. The machine builds one tower for each count.', '👀 Do your towers fit the outlines?'],
      say: 'Build towers that match the dotted outlines. Set start, stop and jump. Then press count.',
      notes: ['A for loop without the name: the counter changes each pass and the body uses it.'],
      cfg: { levels: [[1, 2, 3, 4, 5], [2, 4, 6, 8], [5, 4, 3, 2, 1]], jumps: [1, 2, 3, -1, -2], start: { start: 1, stop: 3, jump: 1 } } },

    { id: 'B8', tier: 'older', unit: 0, icon: '⭐', title: 'Make-a-Block', skill: 'Functions', engine: 'codeGrid',
      goal: 'Jump over three rocks with only 9 blocks.',
      steps: ['👆 Tap the green box. Build one jump from arrows.', '⭐ Tap the green My block button to use your jump in the main program.', '▶ Press Run.'],
      say: 'Jump over three rocks. Build one jump in the green box. Then use your star block again and again. You only have nine blocks.',
      notes: ['A function is a named list of steps you can reuse. Without it, the shortest program is 10 blocks.'],
      cfg: { max: 9, func: true, solution: { fn: ['U', 'R', 'R', 'D'], main: ['*', 'R', '*', 'R', '*'] }, board: { w: 9, h: 2, start: [0, 1], goal: [8, 1], walls: [[1, 1], [4, 1], [7, 1]], wallIcon: '🪨', hero: '🦘', prize: '🏁', bw: 420 } } },

    { id: 'B10', tier: 'older', unit: 0, icon: '✏️', title: 'Draw Bot', skill: 'Drawing with code', engine: 'turtle',
      goal: 'Draw the dotted shape.',
      steps: ['⬆ Forward draws a line to the next dot.', '↻ and ↺ turn the robot on the spot.', '▶ Press Draw. Your lines must cover the dotted shape.'],
      say: 'Draw the dotted shape. Forward draws a line. The turn buttons turn the robot. Then press draw.',
      notes: ['Turning is relative to the robot: a step up from screen arrows.'],
      cfg: { n: 5, shapes: [{ start: [1, 3], dir: 0, sol: 'FFRFFRFFRFFR' }, { start: [0, 4], dir: 0, sol: 'FRFLFRFLFRFL' }] } },

    { id: 'B3', tier: 'older', unit: 1, icon: '🧺', title: 'Sorting Machine', skill: 'If / else', engine: 'sorter',
      goal: 'Sort every shape into the right basket.',
      steps: ['👀 Read the goal at the top.', '👆 Pick the condition for the left basket.', '▶ Press Run machine.'],
      say: 'Sort every shape into the right basket. Read the goal. Pick the condition for the left basket. Then run the machine.',
      notes: ['The skill is choosing which property matters (shape or colour).'],
      cfg: { items: [['star', 'red'], ['circle', 'blue'], ['star', 'yellow'], ['circle', 'red'], ['star', 'blue'], ['square', 'yellow'], ['square', 'blue']],
             goals: [{ text: 'Goal: every ⭐ star goes in the LEFT basket.', k: 'shape', v: 'star' }, { text: 'Goal: every blue shape goes in the LEFT basket.', k: 'color', v: 'blue' }] } },

    { id: 'B5', tier: 'older', unit: 1, icon: '🚪', title: 'Odd or Even Gate', skill: 'Logic rules', engine: 'parity',
      goal: 'Send every even number through the even door.',
      steps: ['👆 Tap the last digits that make a number even.', '💡 Tap a digit to see if it splits into pairs.', '▶ Press Run gate. The gate only looks at the last digit.'],
      say: 'Send every even number through the even door. Tap the last digits that make a number even. The gate only looks at the last digit.',
      notes: ['Even means "splits into pairs with none left over". The 10 numbers end in all 10 digits.'],
      cfg: { nums: [14, 27, 130, 9, 58, 203, 66, 1001, 52, 35] } },

    { id: 'B9', tier: 'older', unit: 1, icon: '🫙', title: 'Magic Jar', skill: 'Variables', engine: 'jar',
      goal: 'Find the number in the jar at the end.',
      steps: ['👀 Read the program, line by line.', '👆 Tap the number you think ends up in the jar.', '🎬 Watch the program run to check.'],
      say: 'Find the number in the jar at the end. Read the program line by line. Then tap your answer.',
      notes: ['A variable is a named box whose value changes. Wording follows Scratch.'],
      cfg: { rounds: [
        { lines: [['set', 3], ['add', 2], ['add', 2]], opts: [5, 7, 9] },
        { lines: [['set', 1], ['repeat', 3, [['add', 4]]]], opts: [5, 13, 12] },
        { lines: [['set', 10], ['add', -3], ['double']], opts: [20, 14, 7] } ] } },

    { id: 'B6', tier: 'older', unit: 1, icon: '🧮', title: 'Block Adder', skill: 'Place value', engine: 'adder',
      goal: 'Add the numbers with blocks.',
      steps: ['Push the ones together.', 'Ten or more ones? Trade 10 ones for 1 ten.', 'Push the tens together.', 'Read the answer. Each column holds at most 9.'],
      say: 'Add the numbers with blocks. Push the ones together first. Trade ten ones for a ten. Then push the tens.',
      notes: ['Column addition is an algorithm with a condition inside it. Wrong answers on offer are the common mistakes.'],
      cfg: { problems: [[23, 45], [27, 35], [48, 36]] } },

    { id: 'B7', tier: 'older', unit: 1, icon: '🪞', title: 'Mirror Numbers', skill: 'Palindromes', engine: 'mirror',
      goal: 'Find the mirror numbers.',
      steps: ['👆 A mirror number reads the same backwards, like 121. Tap them all.', '✔ Press Check.', '🔄 Then press Flip and add until you make a mirror number.'],
      say: 'Find the mirror numbers. A mirror number reads the same forwards and backwards. Tap them all. Then press check.',
      notes: ['Flip-and-add is a "repeat until" loop. The kid decides when to stop.'],
      cfg: { tiles: [121, 123, 44, 1221, 908, 7, 3443, 56], starts: [57, 68] } },

    { id: 'B11', tier: 'older', unit: 2, icon: '📻', title: 'Robot Radio', skill: 'Voice coding', engine: 'voiceCode',
      goal: 'Program the robot with your voice.',
      steps: ['🎤 Tap the microphone.', '🗣️ Say forward, left or right to add blocks.', '▶ Say go to run. Say undo to remove a block.'],
      say: 'Program the robot with your voice. Say forward, left, or right to add blocks. Say go to run it.',
      notes: ['Left and right turn the robot on the spot, relative to where it faces (the red arrow).', 'Speaking builds a program first, then go runs it, unlike Talk to Bunny which moves at once.'],
      cfg: { board: { w: 5, h: 5, start: [0, 4], goal: [4, 0], heading: 0, path: [[0, 4], [0, 3], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [3, 0], [4, 0]], wallIcon: '🧱', hero: '🤖', prize: '🔋' },
             words: { F: { label: 'forward', glyph: '⬆', hear: ['go forward', 'move forward', 'forward', 'forwards', 'straight', 'for word', 'four word'] },
                      LT: { label: 'left', glyph: '↺', hear: ['turn left', 'left', 'lift'] },
                      RT: { label: 'right', glyph: '↻', hear: ['turn right', 'right', 'write', 'rite', 'all right', 'alright'] },
                      GO: { label: 'go', glyph: '▶', hear: ['go', 'run', 'start', 'play'] },
                      UNDO: { label: 'undo', glyph: '⌫', hear: ['undo', 'oops', 'delete', 'back'] } } } },

    /* ---------- Ages 7–8: words, lists, luck, bugs and memory ---------- */
    { id: 'B17', tier: 'older', unit: 3, icon: '🔤', title: 'Letter Counter', skill: 'Loops + counting', engine: 'letterLoop',
      goal: 'How many of one letter are in the word?',
      steps: ['👀 Look at the word and the letter to count.', '👆 Tap the number you think is right.', '🎬 Watch the loop check every letter.'],
      say: 'How many of one letter are in the word? Tap your answer. Then watch the loop check every letter.',
      notes: ['The loop visits each letter, asks a question, and adds 1 to a counter variable when the answer is yes.'],
      cfg: { rounds: [{ word: 'strawberry', letter: 'r' }, { word: 'mississippi', letter: 's' }, { word: 'bookkeeper', letter: 'e' }] } },

    { id: 'B18', tier: 'older', unit: 3, icon: '🔗', title: 'Word Glue Code', skill: 'Joining strings', engine: 'concatCode',
      goal: 'Work out what the plus sign makes.',
      steps: ['👀 Read the code. Each word is in quotes.', '➕ The plus sign sticks words together, in order.', '👆 Tap the result. A space counts as a letter!'],
      say: 'Work out what the plus sign makes. Read the code. The plus sign sticks words together in order. A space counts as a letter.',
      notes: ['Joining strings with + is called concatenation. A space is a character that must be added on purpose.'],
      cfg: { rounds: [
        { lines: ['a = "sun"', 'b = "flower"'], expr: 'a + b', ans: 'sunflower', opts: ['sunflower', 'flowersun', 'sun flower'] },
        { lines: ['hello = "Hi"', 'name = "Maya"'], expr: 'hello + " " + name', ans: 'Hi Maya', opts: ['HiMaya', 'Hi Maya', 'Maya Hi'] },
        { lines: ['x = "ice"', 'y = "cream"'], expr: 'y + " " + x', ans: 'cream ice', opts: ['ice cream', 'cream ice', 'icecream'] },
        { lines: ['place = "Room "', 'n = "7"'], expr: 'place + n', ans: 'Room 7', opts: ['Room7', 'Room 7', '7 Room'] } ] } },

    { id: 'B19', tier: 'older', unit: 3, icon: '🔎', title: 'Number Hunt', skill: 'Searching a list', engine: 'search',
      goal: 'Find the hidden number. Flip as few cards as you can.',
      steps: ['👀 Read which number to find.', '👆 Tap a card to flip it.', '⭐ When the cards are in order, the clues help you skip!'],
      say: 'Find the hidden number. Tap a card to flip it. When the cards are in order, use the clues to skip ahead.',
      notes: ['Round 1 is a linear search: check one by one. Rounds 2 and 3 are sorted, so the middle card halves the search each time (binary search).'],
      cfg: { rounds: [
        { cards: [34, 7, 81, 19, 56, 3, 92, 45, 28, 67], target: 56, sorted: false, budget: 10 },
        { cards: [3, 8, 15, 21, 27, 34, 42, 49, 56, 63, 71, 88], target: 63, sorted: true, budget: 4 },
        { cards: [2, 5, 9, 14, 18, 23, 29, 35, 41, 48, 54, 61, 67, 74, 82, 95], target: 74, sorted: true, budget: 4 } ] } },

    { id: 'B20', tier: 'older', unit: 3, icon: '🐾', title: 'Pet Shelf', skill: 'Arrays', engine: 'array',
      goal: 'Look after the pets on the shelf. An array is a row of boxes.',
      steps: ['👀 Boxes are numbered. The first box is 0!', '👆 Do each job at the top.', '➕ An array can grow at the end.'],
      say: 'Look after the pets on the shelf. An array is a row of numbered boxes. The first box is number zero. Do each job at the top.',
      notes: ['Arrays are numbered from 0. Reading, changing, adding to the end and counting items are the four basic array jobs.'],
      cfg: { name: 'pets', arr: ['🐶', '🐱', '🐰', '🐹'], pool: ['🐸', '🦄', '🐢', '🐟'],
        tasks: [{ t: 'get', i: 2 }, { t: 'set', i: 1, e: '🐸' }, { t: 'push', e: '🦄' }, { t: 'len' }] } },

    { id: 'B21', tier: 'older', unit: 3, icon: '🔀', title: 'Flip the Grid', skill: 'Transposing', engine: 'transpose',
      goal: 'Flip the grid: turn every row into a column.',
      steps: ['👆 Tap a row on the left.', '👆 Tap the column on the right where that row goes.', '🎯 Then find where the glowing item landed.'],
      say: 'Flip the grid. Turn every row into a column. Tap a row on the left. Then tap the column where it goes.',
      notes: ['Transposing swaps rows and columns: the item at row r, column c moves to row c, column r.'],
      cfg: { rounds: [
        { grid: [[1, 2, 3], [4, 5, 6]], probe: [1, 2] },
        { grid: [['🍎', '🍌', '🍇'], ['🐶', '🐱', '🐰'], ['⚽', '🏀', '🎾']], probe: [0, 2] } ] } },

    { id: 'B13', tier: 'older', unit: 4, icon: '🍀', title: 'Lucky Number', skill: 'Guessing + if/else', engine: 'guess',
      goal: 'Find the lucky number between 1 and 20.',
      steps: ['👆 Pick a number with the + and − buttons.', '🍀 Press Guess. I say higher or lower.', '💡 The green bar shows where the number can still be.'],
      say: 'Find the lucky number between one and twenty. Pick a number and press guess. I will say higher or lower.',
      notes: ['The computer picks the secret with a random number generator. Guessing the middle of the green bar finds it in 5 guesses or fewer.', 'Stars: 3 for up to 4 guesses, 2 for 5.'],
      cfg: { min: 1, max: 20, maxTries: 7 } },

    { id: 'B14', tier: 'older', unit: 4, icon: '🎲', title: 'Random Machine', skill: 'Random numbers', engine: 'rng',
      goal: 'Set up the random number machine.',
      steps: ['⚙️ Set the lowest and highest number it can pick.', '🎲 Press Roll at least 3 times to test it.', '✔ Press Check when it matches the job.'],
      say: 'Set up the random number machine. Set the lowest and highest number. Roll it three times to test it. Then press check.',
      notes: ['A random number generator picks any whole number from its range. Each roll can be different.'],
      cfg: { rolls: 3, rounds: [
        { goal: 'Make a dice. It must roll 1 to 6.', start: [1, 3], min: 1, max: 6, hint: 'A dice has 6 sides, from 1 to 6.' },
        { goal: 'Make a coin flip. 1 is heads and 2 is tails.', start: [1, 4], min: 1, max: 2, hint: 'A coin has 2 sides: 1 and 2.' },
        { goal: 'Pick a lucky number from 10 to 20.', start: [8, 25], min: 10, max: 20, hint: 'It must roll from 10 up to 20.' } ] } },

    { id: 'B15', tier: 'older', unit: 4, icon: '🔐', title: 'Memory Vault', skill: 'Memory', engine: 'vault',
      goal: 'Remember what is in each numbered locker.',
      steps: ['👀 Press the button. Lockers open for a moment.', '🧠 Remember what is in each locker number.', '👆 Then I ask: what was in locker 3?'],
      say: 'Remember what is in each numbered locker. Press the button to look. Then I will ask what was in one of the lockers.',
      notes: ['Computer memory is a row of numbered boxes. You find a thing by its number, like a locker number.'],
      cfg: { pool: ['🍎', '🚀', '🐢', '🎸', '🍕', '🦄', '⚽', '🌵', '🐙', '🎩'], rounds: [{ n: 4, q: 3, show: 3500 }, { n: 6, q: 3, show: 4500 }] } },

    { id: 'B16', tier: 'older', unit: 4, icon: '🕵️', title: 'Bug Detective', skill: 'Finding bugs in code', engine: 'bugCode',
      goal: 'The code makes the wrong number. Find the bug and fix it.',
      steps: ['▶ Press Run. See what number the jar ends on.', '🐛 Tap the line with the bug.', '🛠️ Pick the line that fixes it. Run again!'],
      say: 'The code makes the wrong number. Press run to see. Tap the line with the bug. Then pick the line that fixes it.',
      notes: ['A bug is a mistake in code. Compare the result with the goal, then trace the code one line at a time.'],
      cfg: { rounds: [
        { goal: 10, lines: [{ k: 'set', v: 2 }, { k: 'add', v: 4 }, { k: 'add', v: 3 }], bug: 2, opts: [{ k: 'add', v: 3 }, { k: 'add', v: 4 }, { k: 'double' }], fix: 1 },
        { goal: 12, lines: [{ k: 'set', v: 3 }, { k: 'rep', n: 2, v: 3 }], bug: 1, opts: [{ k: 'rep', n: 4, v: 3 }, { k: 'rep', n: 3, v: 3 }, { k: 'rep', n: 2, v: 4 }], fix: 1 },
        { goal: 14, lines: [{ k: 'set', v: 5 }, { k: 'double' }, { k: 'add', v: 2 }], bug: 2, opts: [{ k: 'double' }, { k: 'add', v: 3 }, { k: 'add', v: 4 }], fix: 2 } ] } }
  ]
};
})();
