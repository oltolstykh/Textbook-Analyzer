/* Проверочный набор предложений для грамматических правил ядра: node tests/grammar-cases.js – для каждого предложения печатаются найденные конструкции и их уровни по EGP. */
const path = require('path'); global.window = global;
['resources', 'lexicon', 'cefrj', 'core'].forEach(f => require(path.resolve(__dirname, '..', 'js', f + '.js')));
const C = IA_CORE, lex = C.makeLexicon(null, 'augment', 'cefrj', false);
const cases = [
  'Yesterday I went to the park and played football.', 'The first bicycle was made in Germany in 1817.', 'People pushed it with their feet.',
  'She was reading when the phone rang.', 'They are watching TV now.', "I'm working today.", "Anna's reading a book.",
  "I've never seen it.", 'Have you ever eaten sushi?', "She's gone home.", 'He has been working here for years.', 'They had been waiting for an hour.',
  'We will meet tomorrow.', "They'll come later.", 'I am going to visit my grandmother.', 'I used to play the piano.', 'I am used to it.',
  'You have to finish it.', 'She needs to rest.', 'You had better go.', 'He was able to swim.', 'The answers can be found in the text.',
  'The house will be built next year.', 'The road is being repaired.', 'The bridge has been closed.', 'The letter was written by Tom.',
  'He is taller than his brother.', 'This is the best film.', 'It was the biggest house in the town.', 'She is as tall as her mother.',
  'It is too cold to swim.', 'It was so hot that we stayed inside.', 'It was such a nice day.', 'He is old enough to drive.',
  'This one is much better.', 'It is getting colder and colder.', 'The more you read, the more you learn.',
  'It is important to sleep well.', 'It is difficult for students to understand.', 'He left early in order to catch the train.',
  'Try not to be late.', 'I do not know what to do.', 'She asked me to help her.', 'I want you to come.', 'My mum made me tidy my room.',
  'Let me know.', 'I had my hair cut.', 'I saw him running.', 'I heard her sing.', 'They got married last year.', 'Having finished, he left.',
  'I hate being told what to do.', 'I stayed at home because it was raining.', 'Call me as soon as you arrive.', 'He looks as if he is tired.',
  'Take an umbrella in case it rains.', 'Despite the rain, we went out.', 'You can sit wherever you like.', 'Neither Tom nor Ann came.',
  'He told me that he was ill.', 'I think he is right.', 'I wish I were taller.', 'I only wish I had done it earlier.', 'They help each other.',
  'He hurt himself.', "It's a nice day, isn't it?", 'So do I.', 'Never have I seen such a mess.', 'What I need is a holiday.',
  'If I had known, I would have come.', 'If it rains, we will stay at home.', 'Did you see him?', "I didn't go.", 'There is a cat in the garden.',
  'There were many people.', 'There will be a party.', 'There has been an accident.', 'You can go now.', 'Could you help me?', 'Shall we dance?',
  "Let's go!", 'I would like a cup of tea.', 'We would go there every summer.', 'I had breakfast at seven.',
  // ловушки
  'Read the text and answer the questions.', 'Complete the sentences with the words given below.', 'Match the underlined words with their meanings.',
  'Listen to the recording.', 'The painted wall looks nice.', 'I was interested in the film.', 'A can of beans.', 'Interested students should apply.',
  'Work in pairs. Discuss the questions.', 'Use the words in the box.', 'Students organised trips.', 'Write about your last holiday.',
  // типичные формулировки инструкций
  'Ask your partner to describe his favourite place.', 'Tell your partner about your weekend.', 'Look at the photos. What can you see?',
  'Which words are used to describe feelings?', 'Have you ever been to London? Tell your partner.', 'Underline the verbs used in the past.',
  'Read the email Tom wrote to his friend.', 'Write sentences about what you did yesterday.', 'Match the sentences you heard with the pictures.',
  'Say what each person is doing.', 'Answer the questions using the information given in the text.', 'Decide if the statements are true or false.',
  'You will hear a conversation between two friends.', 'Skim the article, then scan it to locate the information required to complete the table.'
];
for (const s of cases) {
  const { toks } = C.tokenize(s, lex);
  const h = C.grammar(toks, lex).map(g => C.resolveGrammar(g, 'egp') || g);
  console.log(s.padEnd(58), '|', h.map(g => g.id + ':' + g.level + '«' + s.slice(g.start, g.end) + '»').join('  '));
}
