/* Эталоны анализатора, кроме списка лексики.
   Версия: res-0.4 (2026-11-21) – эталоны режима «Тексты», сопоставление расширенных грамматических правил с CEFR-J Grammar Profile, конструкции синтаксического разбора. Все уровни – рабочие, подлежат сверке
   с English Grammar Profile и English Vocabulary Profile. */
(function (g) {
  const _t = g._t || (s => s);
  const R = {};
  R.version = 'res-0.4';
  R.LEVELS = ['A1','A2','B1','B2','C1','C2'];

  /* Инструктивные значения многозначных и «учебных» слов.
     Список CEFR даёт уровень вне контекста; в инструкции эти слова
     выступают в учебном значении и знакомы раньше. */
  R.SENSES = {
    complete: ['A2',_t('заполнить, дополнить (в CEFR-J глагол – B1)')],
    circle:   ['A1',_t('обвести (инструктивное значение)')],
    tick:     ['A2',_t('отметить галочкой (инструктивное значение)')],
    underline:['A2',_t('подчеркнуть (инструктивное значение)')],
    gap:      ['A2',_t('пропуск в тексте (инструктивное значение)')],
    blank:    ['A2',_t('пропуск в тексте (инструктивное значение)')],
    box:      ['A1',_t('рамка со словами (инструктивное значение)')],
    match:    ['A2',_t('соотнести (не «матч»)')],
    cross:    ['A2',_t('зачеркнуть (инструктивное значение)')],
    number:   ['A1',_t('пронумеровать (инструктивное значение)')],
    order:    ['A2',_t('порядок (инструктивное значение)')],
    pair:     ['A1',_t('пара (форма работы)')],
    partner:  ['A1',_t('партнёр по заданию')],
    describe: ['A1',_t('описать')],
    dialogue: ['A1',_t('диалог')],
    sentence: ['A1',_t('предложение')],
    key:      ['A2',_t('ключ к заданию')],
    mark:     ['A2',_t('отметить')],
    missing:  ['A2',_t('недостающий')],
    swap:     ['B1',_t('поменяться ролями')],
    prompt:   ['B2',_t('опора, подсказка (инструктивное значение)')],
    cue:      ['B2',_t('опора, подсказка (инструктивное значение)')],
    role:     ['A2',_t('роль')],
    recording:['A2',_t('аудиозапись')],
    survey:   ['A2',_t('опрос')],
    quiz:     ['A1',_t('викторина')],
    chart:    ['A2',_t('таблица, схема')],
    letter:   ['A1',_t('буква или письмо')],
    exercise: ['A1',_t('упражнение')],
    activity: ['A1',_t('задание')],
    task:     ['A2',_t('задание')]
  };

  /* Неправильные формы – словарная форма */
  const IRR = `was:be were:be been:be being:be is:be are:be am:be 's:be had:have has:have did:do done:do does:do went:go gone:go goes:go wrote:write written:write said:say made:make took:take taken:take gave:give given:give got:get gotten:get saw:see seen:see came:come knew:know known:know thought:think found:find told:tell became:become left:leave felt:feel brought:bring began:begin begun:begin kept:keep held:hold stood:stand heard:hear meant:mean met:meet ran:run paid:pay sat:sit spoke:speak spoken:speak led:lead grew:grow grown:grow lost:lose fell:fall fallen:fall sent:send built:build understood:understand drew:draw drawn:draw broke:break broken:break spent:spend rose:rise risen:rise drove:drive driven:drive bought:buy wore:wear worn:wear chose:choose chosen:choose sought:seek threw:throw thrown:throw caught:catch dealt:deal won:win forgot:forget forgotten:forget taught:teach ate:eat eaten:eat drank:drink drunk:drink sang:sing sung:sing swam:swim swum:swim flew:fly flown:fly hid:hide hidden:hide shook:shake shaken:shake rode:ride ridden:ride woke:wake woken:wake sold:sell stole:steal stolen:steal slept:sleep fed:feed fought:fight hung:hang shot:shoot struck:strike stuck:stick mistook:mistake mistaken:mistake showed:show shown:show spelt:spell learnt:learn dreamt:dream men:man women:woman children:child feet:foot teeth:tooth mice:mouse worse:bad worst:bad better:good best:good further:far lay:lie lain:lie hit:hit put:put set:set let:let cut:cut read:read`;
  R.IRREGULAR = {};
  IRR.split(/\s+/).forEach(p => { const [a,b] = p.split(':'); R.IRREGULAR[a] = b; });
  R.IRREGULAR_PP = new Set('been done gone written made taken given got gotten seen come known thought found told left felt brought begun kept held heard meant set met paid spoken led grown lost fallen sent built understood drawn broken spent cut driven bought worn chosen thrown caught won forgotten taught eaten drunk sung hidden shown said read put spelt learnt mistaken hung stuck struck'.split(' '));
  R.ADJ_ED = new Set('interested bored tired married excited surprised worried pleased confused scared shocked frightened amazed annoyed embarrassed relaxed satisfied disappointed related based supposed used allowed called'.split(' '));
  R.NOT_ING = new Set('something nothing anything everything morning evening thing during spring king ring sing bring string ceiling'.split(' '));

  /* Устойчивые сочетания и фразовые глаголы – распознаются как единица.
     Записаны в словарной форме; [уровень, тип] */
  R.MWE = {
    'fill in':['A2',_t('фразовый глагол')], 'fill out':['B1',_t('фразовый глагол')], 'look up':['B1',_t('фразовый глагол')],
    'look at':['A1',_t('фразовый глагол')], 'look for':['A1',_t('фразовый глагол')], 'look through':['B2',_t('фразовый глагол')],
    'find out':['A2',_t('фразовый глагол')], 'work out':['B1',_t('фразовый глагол')], 'write down':['A2',_t('фразовый глагол')],
    'note down':['B1',_t('фразовый глагол')], 'jot down':['C1',_t('фразовый глагол')], 'cross out':['B1',_t('фразовый глагол')],
    'tick off':['B2',_t('фразовый глагол')], 'point out':['B1',_t('фразовый глагол')], 'come up with':['B2',_t('фразовый глагол')],
    'act out':['B1',_t('фразовый глагол')], 'read out':['B1',_t('фразовый глагол')], 'read aloud':['B1',_t('устойчивое сочетание')],
    'talk about':['A1',_t('глагол с предлогом')], 'think about':['A1',_t('глагол с предлогом')], 'think of':['A2',_t('глагол с предлогом')],
    'listen to':['A1',_t('глагол с предлогом')], 'listen again':['A1',_t('устойчивое сочетание')], 'go over':['B2',_t('фразовый глагол')],
    'pick out':['B2',_t('фразовый глагол')], 'sort out':['B1',_t('фразовый глагол')], 'carry out':['B1',_t('фразовый глагол')],
    'take turn':['B1',_t('устойчивое сочетание')], 'take note':['B1',_t('устойчивое сочетание')], 'make note':['B1',_t('устойчивое сочетание')],
    'in pair':['A1',_t('форма работы')], 'in group':['A1',_t('форма работы')], 'in small group':['A1',_t('форма работы')], 'in turn':['B2',_t('устойчивое сочетание')],
    'on your own':['A2',_t('форма работы')], 'role play':['B1',_t('устойчивое сочетание')], 'role-play':['B1',_t('устойчивое сочетание')],
    'swap role':['B1',_t('устойчивое сочетание')], 'according to':['A2',_t('составной предлог')], 'for example':['A1',_t('устойчивое сочетание')],
    'such as':['A2',_t('составной предлог')], 'a lot of':['A1',_t('устойчивое сочетание')], 'in order to':['B1',_t('союз цели')],
    'make sure':['B1',_t('устойчивое сочетание')], 'at least':['A2',_t('устойчивое сочетание')], 'put in order':['A2',_t('устойчивое сочетание')],
    'in the correct order':['A2',_t('устойчивое сочетание')], 'in the right order':['A2',_t('устойчивое сочетание')],
    'true or false':['A1',_t('устойчивое сочетание')], 'in your own word':['B1',_t('устойчивое сочетание')],
    'as quickly as possible':['A2',_t('устойчивое сочетание')], 'instead of':['B1',_t('составной предлог')],
    'in front of':['A1',_t('составной предлог')], 'next to':['A1',_t('составной предлог')], 'each other':['A2',_t('местоимение')],
    'turn over':['B1',_t('фразовый глагол')], 'match up':['B1',_t('фразовый глагол')], 'join up':['B1',_t('фразовый глагол')],
    'make up':['B1',_t('фразовый глагол')], 'find in':['A1',_t('глагол с предлогом')]
  };
  delete R.MWE['find in'];

  /* Глаголы, которые открывают действие в инструкции */
  R.ACTION_VERBS = new Set(('read listen write complete fill match choose circle underline tick answer ask discuss talk look find check compare put number correct rewrite translate describe tell say use work make label order cross practise practice repeat sing draw think guess decide report present summarise summarize prepare imagine act copy spell mark highlight sort group add replace change rephrase paraphrase explain agree share note take watch play swap join connect link select pick insert supply complete transform convert identify underline classify categorise categorize rank arrange number interview role-play roleplay predict scan skim justify outline brainstorm jot contrast evaluate analyse analyze give show point say learn remember close open turn go come try see hear speak chat record send fill work cover list name finish start begin follow exchange vote solve create design plan research search review revise edit test score ask'.split(/\s+/)));
  R.ORG_VERBS = new Set(['work']); // «Work in pairs» – организационное указание
  R.REPORT_VERBS = new Set('say tell explain decide ask discuss guess write find check know describe show think remember imagine predict agree note notice report decide answer'.split(' '));

  /* Метаязык – термин и уровень, с которого он допустим без пояснения */
  R.META = {
    'word':'A1','sentence':'A1','letter':'A1','question':'A1','answer':'A1','text':'A1','dialogue':'A1','noun':'A1','verb':'A1',
    'sound':'A1','paragraph':'A2','adjective':'A2','adverb':'A2','tense':'A2','present simple':'A1','present continuous':'A1',
    'past simple':'A2','past continuous':'B1','present perfect':'B1','past perfect':'B1','future':'A2','plural':'A1','singular':'A2',
    'preposition':'A2','pronoun':'A2','article':'A2','phrase':'A2','vowel':'A2','consonant':'A2','comparative':'A2','superlative':'A2',
    'countable':'A2','uncountable':'A2','negative':'A2','affirmative':'B1','short answer':'A2','question word':'A2',
    'gerund':'B1','infinitive':'B1','passive':'B1','active':'B1','modal verb':'B1','modal':'B1','phrasal verb':'B1','linking word':'B1',
    'connector':'B1','conjunction':'B1','relative clause':'B1','conditional':'B1','prefix':'B1','suffix':'B1','synonym':'B1',
    'antonym':'B1','opposite':'A2','stress':'B1','intonation':'B1','syllable':'B1','transcription':'B1','reported speech':'B1',
    'direct speech':'B1','indirect speech':'B2','question tag':'B1','contraction':'B1','word formation':'B1','collocation':'B2',
    'paraphrase':'B2','clause':'B2','participle':'B2','auxiliary':'B2','auxiliary verb':'B2','determiner':'B2','quantifier':'B2',
    'idiom':'B2','indirect question':'B2','discourse marker':'C1','cohesion':'C1','coherence':'C1','register':'C1','collocate':'C1',
    'subjunctive':'C1','inversion':'C1','cleft sentence':'C1','lexical item':'C1','connotation':'C1','homophone':'B2','schwa':'C1',
    'weak form':'B2','linking':'B2','topic sentence':'B2','genre':'B2','summary':'B1','prompt':'B2','key word':'B1','headline':'B1'
  };

  /* Замены для слов и сочетаний выше уровня */
  R.REPLACE = {
    appropriate:'correct, right', suitable:'right, good', relevant:'right, correct', utilise:'use', utilize:'use',
    paraphrase:'say in other words', rephrase:'say in a different way', statement:'sentence', provide:'give',
    indicate:'show', identify:'find', determine:'find, decide', corresponding:'matching', accompany:'—',
    extract:'text', passage:'text', outline:'plan', summarise:'say the main ideas', summarize:'say the main ideas',
    justify:'say why', elaborate:'say more', infer:'guess', predict:'guess', scan:'read quickly and find',
    skim:'read quickly', highlight:'mark, underline', spot:'find', 'come up with':'think of', brainstorm:'think of ideas together',
    'jot down':'write', rank:'put in order', category:'group', classify:'put into groups', categorise:'put into groups',
    sequence:'order', contrast:'compare', item:'word, thing', option:'answer', alternative:'other answer',
    bracket:'( )', prompt:'words in the box', cue:'words in the box', 'tick off':'tick', 'go over':'check',
    'pick out':'find', 'look through':'read quickly', 'in turn':'one by one', criterion:'rule', criteria:'rules',
    evaluate:'say how good', analyse:'look at carefully', analyze:'look at carefully', ensure:'make sure',
    respond:'answer', response:'answer', consult:'look at, ask', locate:'find', modify:'change', transform:'change',
    convert:'change', insert:'put in, write', supply:'write', complete:'fill in', accurate:'correct', accurately:'correctly',
    precise:'exact', specify:'say exactly', assign:'give', compile:'make a list of', formulate:'write, make',
    illustrate:'show, give an example', demonstrate:'show', clarify:'explain', discuss:'talk about', describe:'tell about',
    previous:'last', subsequent:'next', following:'next', mention:'say', underlined:'marked', distinguish:'find the difference',
    cohesion:'linking words', collocation:'word partners', gerund:'-ing form', participle:'-ed / -ing form',
    determine:'find', obtain:'get', require:'need', sufficient:'enough', attempt:'try'
  };

  /* Нормы объёма по уровням – рабочие значения, калибруются по корпусу */
  R.NORMS = {
    A1: { words: 8,  wps: 8,  actions: 2 },
    A2: { words: 12, wps: 10, actions: 2 },
    B1: { words: 18, wps: 14, actions: 3 },
    B2: { words: 25, wps: 18, actions: 3 },
    C1: { words: 35, wps: 22, actions: 4 },
    C2: { words: 40, wps: 25, actions: 5 }
  };

  /* Типы заданий для A5 – по главному действию */
  R.TASK_TYPES = [
    { id:'gap',    name:_t('заполнение пропусков'), verbs:['fill in','fill','complete','supply','insert'] },
    { id:'match',  name:_t('соотнесение'),          verbs:['match','match up','connect','join','join up','link'] },
    { id:'choose', name:_t('выбор'),                verbs:['choose','circle','select','pick','tick','underline','cross out','decide'] },
    { id:'order',  name:_t('упорядочивание'),       verbs:['put in order','order','number','rank','arrange'] },
    { id:'trans',  name:_t('трансформация'),        verbs:['rewrite','transform','change','rephrase','paraphrase','convert','make','turn'] },
    { id:'corr',   name:_t('исправление ошибок'),   verbs:['correct'] },
    { id:'sort',   name:_t('классификация'),        verbs:['sort','group','classify','categorise','categorize'] },
    { id:'transl', name:_t('перевод'),              verbs:['translate'] },
    { id:'ans',    name:_t('ответы на вопросы'),    verbs:['answer'] },
    { id:'write',  name:_t('письмо'),               verbs:['write','write down','note down','make note','take note'] },
    { id:'speak',  name:_t('говорение'),            verbs:['discuss','talk','talk about','tell','ask','describe','role-play','role play','act out','present','say','share','interview','chat','explain'] },
    { id:'listen', name:_t('аудирование'),          verbs:['listen','listen to','listen again','watch'] },
    { id:'find',   name:_t('поиск в тексте'),       verbs:['find','look for','scan','spot','identify','find out'] },
    { id:'read',   name:_t('чтение'),               verbs:['read','read out','read aloud','look at','look','skim'] },
    { id:'repeat', name:_t('повторение за образцом'), verbs:['repeat','practise','practice','sing'] }
  ];

  /* Рубрика – рабочая версия 0.1, подлежит согласованию с экспертами */
  R.RUBRIC_VERSION = 'rubric-0.1';
  R.RUBRIC = [
    { code:'R1', name:_t('Понятность'), q:_t('Ясны ли последовательность действий, ожидаемый результат, форма работы и материал, на который опирается задание?'),
      a:[_t('0 – учащийся не может понять, что и с чем делать'),_t('1 – понятно главное действие, но неясен результат или материал'),_t('2 – действия, результат, форма работы и материал ясны')] },
    { code:'R2', name:_t('Глагол-установка'), q:_t('Совпадает ли глагол с тем, что реально делает учащийся?'),
      a:[_t('0 – глагол называет другое действие (discuss при заполнении пропусков)'),_t('1 – глагол слишком общий (do, work with)'),_t('2 – глагол точно называет действие')] },
    { code:'R3', name:_t('Тип упражнения'), q:_t('Соответствует ли формулировка типу упражнения (языковое, условно-речевое, речевое)? Не выдаёт ли она тренировочное упражнение за коммуникативное?'),
      a:[_t('0 – формулировка противоречит типу упражнения'),_t('1 – тип угадывается, но формулировка его размывает'),_t('2 – формулировка соответствует типу')] },
    { code:'R4', name:_t('Речевая ситуация'), q:_t('Для речевых упражнений – заданы ли цель высказывания, роль, адресат и ситуация общения?'),
      a:[_t('0 – ситуация не задана'),_t('1 – задана частично (только тема)'),_t('2 – заданы цель, роль, адресат и ситуация')] },
    { code:'R5', name:_t('Образец выполнения'), q:_t('Нужен ли образец для этого задания и уровня? Есть ли он и соответствует ли инструкции?'),
      a:[_t('0 – образец нужен, но его нет или он противоречит инструкции'),_t('1 – образец есть, но неполный'),_t('2 – образец есть и соответствует (или не нужен)')] },
    { code:'R6', name:_t('Уровень инструкции и задания'), q:_t('Не сложнее ли инструкция самого упражнения? Есть ли на начальных уровнях опоры – образец, пиктограмма, перевод?'),
      a:[_t('0 – инструкция заметно сложнее задания, опор нет'),_t('1 – инструкция немного сложнее или опоры неполные'),_t('2 – инструкция не сложнее задания, опоры есть')] },
    { code:'D1', name:_t('Параметры выполнения'), q:_t('Указаны ли время, объём высказывания, число ответов там, где они нужны?'),
      a:[_t('0 – параметры нужны, но не указаны'),_t('1 – указана часть параметров'),_t('2 – параметры указаны или не нужны')] },
    { code:'D2', name:_t('Форма работы'), q:_t('Не противоречит ли форма работы содержанию задания (Work in pairs при монологе)?'),
      a:[_t('0 – форма работы противоречит заданию'),_t('1 – форма работы не мешает, но не нужна'),_t('2 – форма работы соответствует заданию')] },
    { code:'D4', name:_t('Однозначность'), q:_t('Допускает ли инструкция два толкования?'),
      a:[_t('0 – возможны два и более толкования'),_t('1 – толкование угадывается из материала'),_t('2 – толкование одно')] },
    { code:'D5', name:_t('Язык инструкции'), q:_t('Уместна ли инструкция на изучаемом, родном или двух языках для данного уровня?'),
      a:[_t('0 – язык инструкции не подходит уровню'),_t('1 – подходит, но нужна опора на родной язык'),_t('2 – язык инструкции уместен')] }
  ];

  /* Соответствие правил анализатора пунктам CEFR-J Grammar Profile (ID строки).
     Правила без соответствия используют рабочий уровень из engine.js. */
  R.GMAP = {
    passive:'73', passinf:'91', presperf:'62', pastperf:'67', modperf:'145', pp2:'171', gerprep:'110', verbger:'112',
    using:'213', ingcl:'213', ingpost:'169', relwho:'172', relwhich:'173', relthat:'174', relwhere:'185', nondef:'181',
    whose:'180', whom:'176', indq:'153', indqwhether:'154', indqif:'154', thatcl:'152', cond:'156', time:'155',
    sothat:'160', purp:'88', may:'129', modal2:'139', compar:'39', superl:'41',
    // res-0.3 – правила для повествовательного текста и диалога
    passpast:'76', passmod:'82', passfut:'79', passperf:'75', passcont:'74', presperfcont:'63', pastperfcont:'68', futperf:'71',
    futcont:'70', goingto:'122', pastcont:'66', prescont:'61', beable:'121', beabout:'100', pastbe:'64', will:'69',
    would:'142', can:'123', could:'124', shall:'138', haveto:'127', hasgotto:'128', needto:'136', usedto:'140',
    oughtto:'137', hadbetter:'126', lets:'120', pastdid:'65-1', pastsimple:'65', therebe:'146', theremod:'148', thereperf:'147',
    comper:'38', superlest:'40', asas:'37', tooto:'44', soadjthat:'45', such:'46', enough:'43', intcomp:'51',
    compand:'49', thethe:'50', itadjto:'163', fornpto:'93', inorder:'95', soasto:'97', notto:'89', whto:'167',
    asktell:'209', vobjto:'103', causlet:'206', havesth:'207', percing:'211', percinf:'210', getpp:'87', havingpp:'107',
    beingpp:'108', assoonas:'158', asif:'220', whever:'188', tellthat:'201', thatomit:'162', wish:'218', wish3:'219',
    recip:'27', refl:'23', tag:'193', soinv:'232', neginv:'234', whatcleft:'205', cond3:'216',
    // res-0.4 – конструкции, которые выделяются только по синтаксическому разбору (parse.js)
    pressimple:'59', presbe:'58', imper:'117', relomit:'179'
  };

  R.CRITERIA = {
    A1:{ name:_t('Лексика'), long:_t('Лексический уровень по CEFR') },
    A2:{ name:_t('Грамматика'), long:_t('Грамматическая сложность') },
    A3:{ name:_t('Объём'), long:_t('Объём и плотность') },
    A4:{ name:_t('Метаязык'), long:_t('Метаязыковая нагрузка') },
    A5:{ name:_t('Единообразие'), long:_t('Единообразие формулировок') },
    D1:{ name:_t('Параметры'), long:_t('Параметры выполнения (эвристика)') },
    D3:{ name:_t('Отсылки'), long:_t('Корректность отсылок') },
    D4:{ name:_t('Однозначность'), long:_t('Неоднозначность (эвристика)') },
    ISV:{ name:_t('ИСВ'), long:_t('Индекс сложности восприятия') }
  };


  /* ===================== Режим «Тексты» ===================== */

  /* Типы учебных текстов */
  R.TEXT_TYPES = [
    { id:'reading',   name:_t('текст для чтения'),            rx:/read|чтен|article|стать/i },
    { id:'listening', name:_t('скрипт аудирования'),          rx:/listen|audio|script|аудир|скрипт|запис/i },
    { id:'dialogue',  name:_t('диалог'),                      rx:/dialog|диалог|conversation|беседа/i },
    { id:'material',  name:_t('языковой материал упражнения'), rx:/material|exercise|упражн|материал|sentences|предлож/i }
  ];

  /* Служебные слова для лексической плотности (Ure, 1971) – артикли, местоимения, предлоги,
     союзы, вспомогательные и модальные глаголы, частицы, детерминативы */
  R.FUNCTION_WORDS = new Set((
    'a an the this that these those my your his her its our their mine yours hers ours theirs ' +
    'i you he she it we they me him us them myself yourself himself herself itself ourselves yourselves themselves ' +
    'who whom whose which what that whoever whatever whichever ' +
    'and or but nor so yet for because although though if unless until while whereas whether since as than when where why how ' +
    'about above across after against along among around at before behind below beneath beside besides between beyond by ' +
    'down during except from in inside into like near of off on onto out outside over past per round through throughout till to toward towards under underneath up upon via with within without ' +
    'be am is are was were been being have has had having do does did done doing ' +
    'will would shall should can could may might must ought ' +
    "'s 're 've 'd 'll 'm n't not no yes oh " +
    'all any both each either every few many more most much neither none other several some such ' +
    'one two three four five six seven eight nine ten first second ' +
    'there here then now also too very just only even still already again ever never always often ' +
    "don't doesn't didn't can't won't isn't aren't wasn't weren't haven't hasn't hadn't couldn't wouldn't shouldn't i'm you're he's she's it's we're they're i've you've we've they've i'll you'll he'll she'll we'll they'll i'd you'd he'd she'd we'd they'd let's that's there's what's"
  ).split(/\s+/));

  /* Союзы и союзные слова придаточных предложений – для показателя T3 */
  R.SUBORD = new Set('because although though unless until whereas whenever wherever whether if when while since before after once as who whom whose which where that'.split(' '));

  /* Рабочие нормы для текстов по уровням – средняя длина предложения в словах (wps),
     придаточных на предложение (sub), индекс Флеша-Кинкейда (fk).
     Стартовые значения, калибруются по корпусу (P75 текстов уровня). */
  R.TEXT_NORMS = {
    A1: { wps: 8,  sub: 0.15, fk: 2 },
    A2: { wps: 10, sub: 0.3,  fk: 3.5 },
    B1: { wps: 14, sub: 0.5,  fk: 5.5 },
    B2: { wps: 18, sub: 0.7,  fk: 8 },
    C1: { wps: 22, sub: 0.9,  fk: 10.5 },
    C2: { wps: 25, sub: 1.1,  fk: 12.5 }
  };

  R.TEXT_CRITERIA = {
    T1:{ name:_t('Лексика'), long:_t('Лексическое покрытие относительно уровня') },
    T2:{ name:_t('Грамматика'), long:_t('Плотность конструкций выше уровня') },
    T3:{ name:_t('Синтаксис'), long:_t('Синтаксическая сложность') },
    T4:{ name:_t('Читаемость'), long:_t('Читаемость по Флешу-Кинкейду') },
    IST:{ name:_t('ИСТ'), long:_t('Индекс сложности текста') }
  };

  /* Рубрика для текстов – рабочая версия, подлежит согласованию с экспертами */
  R.TEXT_RUBRIC_VERSION = 'rubric-t-0.1';
  R.TEXT_RUBRIC = [
    { code:'TR1', name:_t('Тема и задача'), q:_t('Соответствует ли текст теме урока и коммуникативной задаче упражнений, к которым он относится? Позволяет ли он выполнить эти упражнения?'),
      a:[_t('0 – текст не связан с темой или не позволяет выполнить задание'),_t('1 – текст связан с темой, но задание выполнимо лишь частично'),_t('2 – текст соответствует теме и обеспечивает выполнение задания')] },
    { code:'TR2', name:_t('Аутентичность'), q:_t('Аутентичен ли текст по языку и содержанию – естественна ли речь, правдоподобна ли ситуация общения, достоверны ли сведения? Сохранены ли эти качества после адаптации?'),
      a:[_t('0 – язык неестествен, ситуация или сведения неправдоподобны'),_t('1 – язык естествен, но ситуация или содержание условны'),_t('2 – текст естествен по языку и правдоподобен по ситуации и содержанию')] },
    { code:'TR3', name:_t('Культурная доступность'), q:_t('Доступны ли учащимся реалии, фоновые знания и культурный контекст текста с учётом их родной культуры? Пояснена ли безэквивалентная лексика?'),
      a:[_t('0 – реалии и фоновые знания недоступны, пояснений нет'),_t('1 – часть реалий требует пояснения, которого нет'),_t('2 – реалии доступны или пояснены')] },
    { code:'TR4', name:_t('Связность и логика'), q:_t('Обладает ли текст смысловой цельностью и связностью? Логичны ли переходы между предложениями и абзацами, есть ли средства связи?'),
      a:[_t('0 – текст фрагментарен, логика нарушена'),_t('1 – логика в целом ясна, но есть разрывы или избыточные повторы'),_t('2 – текст цельный и связный')] },
    { code:'TR5', name:_t('Уровень текста и задания'), q:_t('Соответствует ли сложность текста заявленному уровню и задаче упражнения (вид чтения или аудирования, глубина понимания)?'),
      a:[_t('0 – текст заметно сложнее или проще уровня и задачи'),_t('1 – текст немного выходит за уровень, задача выполнима с опорами'),_t('2 – текст соответствует уровню и задаче')] },
    { code:'TR6', name:_t('Пригодность для аспекта'), q:_t('Пригоден ли текст для заявленного аспекта – для чтения (композиция, заголовки, плотность информации), для аудирования (черты устной речи, избыточность, длина фраз), для языкового материала (частотность и наглядность изучаемого явления)?'),
      a:[_t('0 – текст не пригоден для аспекта'),_t('1 – пригоден с оговорками'),_t('2 – пригоден')] }
  ];

  g.IA_RES = R;
})(typeof window !== 'undefined' ? window : globalThis);
