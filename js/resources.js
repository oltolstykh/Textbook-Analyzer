/* Эталоны анализатора, кроме списка лексики.
   Версия: res-0.6 (2026-11-27) – эталоны методических рекомендаций rec-0.1 (правила для учителя и автора по упражнению, уроку и учебнику). Предыдущая res-0.5 (2026-11-22) – эталоны методики упражнений method-0.1 (тип по степени свободы, этапы, правила последовательности урока), критерий R7 и рубрика урока L1-L2. Предыдущая res-0.4 (2026-11-21) – эталоны режима «Тексты», сопоставление расширенных грамматических правил с CEFR-J Grammar Profile, конструкции синтаксического разбора. Все уровни – рабочие, подлежат сверке
   с English Grammar Profile и English Vocabulary Profile. */
(function (g) {
  const _t = g._t || (s => s);
  const R = {};
  R.version = 'res-0.6'; // res-0.6 – эталоны методических рекомендаций R.REC (rec-0.1)
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

  /* Рубрика – рабочая версия 0.2 (R7 добавлен по sol06, с. 58-59), подлежит согласованию с экспертами */
  R.RUBRIC_VERSION = 'rubric-0.2'; // rubric-0.2 – критерий R7 «Уместность задания»
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
    { code:'R7', name:_t('Уместность задания'), q:_t('Соответствует ли упражнение ведущей цели урока, этапу работы над материалом (ознакомление, тренировка, применение) и уровню группы? Есть ли опоры, нужные для выполнения?'),
      a:[_t('0 – упражнение не связано с целью урока или не подходит этапу и уровню группы'),_t('1 – упражнение связано с целью, но не вполне соответствует этапу или уровню (нет нужных опор, задание преждевременно или избыточно)'),_t('2 – упражнение работает на цель урока, соответствует этапу и уровню группы, опоры достаточны')] },
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

  /* ===================== Методика упражнений – эталоны method-0.1 =====================
     Тип упражнения по степени свободы учащегося, этап работы над материалом, этап работы с текстом,
     единица языкового материала и правила последовательности упражнений урока.
     Критерии изложены своими словами, у каждого правила – ссылка на источник (ключ R.METHOD.SOURCES и страницы).
     Страницы Солововой (2006) сверены по скану издания; у зарубежных пособий год и место издания в файлах
     не указаны – они помечены для сверки. */
  R.METHOD_VERSION = 'method-0.1';
  R.METHOD = {
    SOURCES: {
      sol06: _t('Соловова Е. Н. Методика обучения иностранным языкам : базовый курс лекций : пособие для студентов пед. вузов и учителей. – 4-е изд. – М. : Просвещение, 2006. – 239 с.'),
      harmer: _t('Harmer J. The Practice of English Language Teaching. – 3rd ed., completely revised and updated. – Longman [место и год издания сверить – в файле нет выходных данных].'),
      scriv: _t('Scrivener J. Learning Teaching. The Essential Guide to English Language Teaching. – 3rd ed. – Macmillan [место и год издания сверить; страницы по текстовому слою скана].')
    },
    /* Шкала степени свободы – четыре типа отечественной методики (Соловова, 2006, с. 32),
       их объединение в три группы (языковые, условно-речевые, речевые) и зарубежные соответствия */
    TYPES: [
      { id: 'sub',   n: 1, group: 'lang', name: _t('подстановочное'), en: 'controlled (substitution)',
        def: _t('действия строго по аналогии с образцом или выбор из заданного – один правильный ответ'), src: 'sol06, с. 32; scriv, с. 168-169' },
      { id: 'trans', n: 2, group: 'lang', name: _t('трансформационное'), en: 'controlled (transformation)',
        def: _t('преобразование материала по правилу с избирательным использованием знаний'), src: 'sol06, с. 32, 113-114' },
      { id: 'cond',  n: 3, group: 'cond', name: _t('условно-коммуникативное'), en: 'guided',
        def: _t('учебная ситуация общения смоделирована близко к реальной, но учащийся следует установке и опорам'), src: 'sol06, с. 32, 116-117' },
      { id: 'comm',  n: 4, group: 'speech', name: _t('подлинно коммуникативное'), en: 'communicative (authentic use)',
        def: _t('общение с собственной целью высказывания, без регламентации языковых средств'), src: 'sol06, с. 32; harmer, с. 85; scriv, с. 127' }
    ],
    GROUPS: {
      lang:   { name: _t('языковое (доречевое)'), en: 'controlled practice', src: 'sol06, с. 116' },
      cond:   { name: _t('условно-речевое'), en: 'guided practice', src: 'sol06, с. 114, 116' },
      speech: { name: _t('речевое'), en: 'free practice', src: 'sol06, с. 114, 116' }
    },
    /* Этапы работы над языковым материалом – ознакомление, тренировка, применение (выход в речь);
       зарубежные соответствия – presentation, practice, production (PPP), Engage – Study – Activate */
    PHASES: [
      { id: 'intro', name: _t('ознакомление'), en: 'presentation / clarification (Study)', src: 'sol06, с. 115; scriv, с. 159-160; harmer, с. 84' },
      { id: 'train', name: _t('тренировка'), en: 'practice / restricted output', src: 'sol06, с. 115; scriv, с. 159-160, 168' },
      { id: 'apply', name: _t('применение'), en: 'production / authentic output (Activate)', src: 'sol06, с. 115; harmer, с. 84; scriv, с. 127' }
    ],
    /* Этапы работы с текстом для чтения и аудирования */
    TEXT_STAGES: [
      { id: 'pre',   name: _t('дотекстовый'), en: 'pre-reading / before listening', src: 'sol06, с. 136-138, 161-162' },
      { id: 'while', name: _t('текстовый'), en: 'while-reading / while listening', src: 'sol06, с. 138-139, 162' },
      { id: 'post',  name: _t('послетекстовый'), en: 'follow-up', src: 'sol06, с. 139, 163' }
    ],
    /* Единица языкового материала – система лексических упражнений «от простого к сложному» */
    UNITS: [
      { id: 'word',   n: 1, name: _t('слово') },
      { id: 'phrase', n: 2, name: _t('словосочетание') },
      { id: 'sent',   n: 3, name: _t('предложение') },
      { id: 'text',   n: 4, name: _t('сверхфразовое единство') }
    ],
    UNITS_SRC: 'sol06, с. 93-98',
    /* Правила последовательности упражнений урока. weight – вклад в показатель урока ПСУ */
    RULES: [
      { id: 'jump', weight: 1, name: _t('скачок'),
        text: _t('Речевое задание (или условно-речевое после одних языковых) идёт без промежуточной тренировки – между предыдущим максимумом урока и заданием пропущена ступень шкалы свободы.'),
        src: 'sol06, с. 32, 59, 115-116', alt: _t('Зарубежная методика допускает обратный порядок – задание до анализа языка (deep end, boomerang, test-teach-test).'), altSrc: 'harmer, с. 82-84; scriv, с. 179-180' },
      { id: 'return', weight: 0.5, name: _t('возврат'),
        text: _t('После речевого задания урок возвращается к языковому упражнению.'),
        src: 'sol06, с. 59', alt: _t('Возврат может быть запланирован – этап анализа языка после задания (boomerang, patchwork у Хармера).'), altSrc: 'harmer, с. 84' },
      { id: 'noApply', weight: 1, name: _t('нет выхода в речь'),
        text: _t('В уроке есть тренировка, но нет речевого задания – этап применения пропущен.'),
        src: 'sol06, с. 115' },
      { id: 'textOrder', weight: 0.5, name: _t('этапы работы с текстом'),
        text: _t('Послетекстовое задание стоит до текстового или текстовое задание идёт без дотекстового этапа.'),
        src: 'sol06, с. 135-139, 160-163' },
      { id: 'unitDrop', weight: 0, name: _t('от сложного к простому'),
        text: _t('Языковое упражнение работает с меньшей единицей материала, чем предыдущее (текст, затем слово) – справочная отметка, в показатель не входит.'),
        src: 'sol06, с. 59, 93' }
    ],
    /* Признаки для определения типа и этапа – регулярные выражения по тексту инструкции */
    CUES: {
      model: /\b(for example|e\.g\.|example|model|like this|as in the example|follow the example|look at the example)\b/,
      support: /\b(in the box|from the box|words below|phrases below|use the (?:words|phrases|prompts|cues|questions|notes|ideas|expressions|useful language)|using the (?:words|phrases|prompts|cues|notes|ideas)|prompts?|cues?|useful language|to help you)\b/,
      form: /\b(correct form|right form|in brackets|tense|past simple|present simple|present perfect|past continuous|present continuous|future|passive|comparative|superlative|gerund|infinitive|modal|conditional|reported speech|plural|negative form|question form|make (?:questions|negatives?|sentences)|rewrite|transform|change (?:the|these)|into the (?:passive|negative|plural|past)|use (?:the )?(?:verbs?|words?) in brackets)\b/,
      comm: /\b(find out|guess|agree on|decide (?:together|on|which|what|who|where|how)|find someone who|survey|interview|imagine|persuade|convince|plan (?:a|an|the|your)|solve|what do you think|your opinion|do you agree|give reasons|why or why not|student a\b|student b\b|don'?t show|without (?:looking|showing)|find (?:the )?(?:\w+ )?differences|true for you|about (?:you|yourself)|your (?:own|family|life|town|city|country|school|friends?|favourite|ideas?|experience)|tell (?:your partner|the class|each other) about|discuss)\b/,
      repro: /\b(practise the (?:dialogue|conversation)|act out the (?:dialogue|conversation)|read the (?:dialogue|conversation) (?:in pairs|aloud|with)|learn (?:it )?by heart|repeat|say it|read aloud|read out|retell)\b/,
      intro: /\b(listen and read|read and listen|look at the (?:rule|grammar|examples?)|notice|complete the (?:rule|grammar (?:box|table))|what do you notice|underline (?:all )?(?:the )?(?:examples?|verbs?|forms?)|find (?:all )?(?:the )?(?:examples?|verbs?|forms?|adjectives?|nouns?|phrases?) (?:of|in)|work out the rule)\b/,
      textRef: /\b(the (?:text|article|story|recording|dialogue|interview|conversation|email|letter|passage|extract|podcast|blog|report|song|poem|advert|programme)|read|listen)\b/,
      pre: /\b(before you (?:read|listen|watch)|predict|look at the (?:title|heading|pictures?|photos?|headline) and (?:guess|predict|say what|discuss|think|answer)|what do you know about|guess what the|think about the topic)\b/,
      post: /\b(after (?:reading|listening|you read|you listen)|retell|summari[sz]e|in your own words|write (?:a )?(?:similar|reply|response|summary)|discuss the (?:text|article|story)|role-?play the (?:situation|conversation) (?:from|in) the)\b/,
      again: /\b(again|second time|once more)\b/
    }
  };
  /* Рубрика урока – оценивается урок целиком, а не отдельная инструкция (sol06, с. 57-60) */
  R.LESSON_RUBRIC_VERSION = 'rubric-l-0.1';
  R.LESSON_RUBRIC = [
    { code: 'L1', name: _t('Последовательность упражнений'), q: _t('Служит ли каждое упражнение опорой для следующего? Идёт ли урок от простого к сложному и от тренировки к выходу в речь? Если порядок иной (задание, затем анализ языка), оправдан ли он целью урока?'),
      a: [_t('0 – упражнения расположены случайно, речевые задания не подготовлены'), _t('1 – логика в целом есть, но есть неподготовленные переходы или пропущен этап'), _t('2 – каждое упражнение готовит следующее, этапы выдержаны или отступление оправдано целью')] },
    { code: 'L2', name: _t('Соответствие цели урока'), q: _t('Работает ли набор упражнений на ведущую практическую цель урока? Достаточно ли упражнений для её достижения и нет ли лишних?'),
      a: [_t('0 – упражнения не связаны с целью урока или цель не угадывается'), _t('1 – большая часть упражнений работает на цель, но есть лишние или не хватает нужных'), _t('2 – упражнения работают на цель урока')] }
  ];

  /* ===================== Методические рекомендации – эталоны rec-0.1 =====================
     Правило переводит найденный признак (критерий A1-A4, D1, D3, D4, ИСВ, тип упражнения, отметку
     последовательности, показатели текста T1-T3, оценку уровня, пару «инструкция – текст») в рекомендацию
     учителю (как работать с учебником на занятии) и автору (что изменить в учебнике).
     Формулировки – своими словами, у каждого правила – ссылка на источник (ключи R.REC.SOURCES и страницы).
     Шаблоны содержат подстановки {ex}, {words} и др., их заполняет recommend.js.
     scope – уровень (item – упражнение или текст, lesson – урок, book – учебник), prio – 1 (мешает выполнить
     задание), 2 (затрудняет), 3 (справочно). */
  R.REC_VERSION = 'rec-0.1';
  R.REC = {
    SOURCES: {
      sol06: _t('Соловова Е. Н. Методика обучения иностранным языкам : базовый курс лекций : пособие для студентов пед. вузов и учителей. – 4-е изд. – М. : Просвещение, 2006. – 239 с.'),
      gez82: _t('Гез Н. И., Ляховицкий М. В., Миролюбов А. А., Фоломкина С. К., Шатилов С. Ф. Методика обучения иностранным языкам в средней школе : учебник. – М. : Высшая школа, 1982. – 373 с.'),
      harmer: _t('Harmer J. The Practice of English Language Teaching. – 3rd ed., completely revised and updated. – Longman [место и год издания сверить – в файле нет выходных данных].'),
      scriv: _t('Scrivener J. Learning Teaching. The Essential Guide to English Language Teaching. – 3rd ed. – Macmillan [место и год издания сверить; страницы по текстовому слою скана].'),
      celta: _t('Thornbury S., Watkins P. The CELTA Course. Trainee Book. – Cambridge University Press [год издания сверить].'),
      tkt: _t('Spratt M., Pulverness A., Williams M. The TKT Course. Modules 1, 2 and 3. – 2nd ed. – Cambridge : Cambridge University Press, 2011.')
    },
    WHO: { teacher: _t('учителю'), author: _t('автору') },
    SCOPES: { book: _t('учебник'), lesson: _t('урок'), item: _t('упражнение') },
    PRIO: { 1: _t('мешает выполнить задание'), 2: _t('затрудняет выполнение'), 3: _t('справочно') },
    RULES: [
      /* ---------- упражнение – формулировка инструкции ---------- */
      { id: 'lex', scope: 'item', kind: 'instr', basis: 'A1', name: _t('Лексика инструкции'),
        teacher: _t('Перед выполнением поясните слова {words} – показом, примером из упражнения или переводом – и повторите инструкцию устно более простыми словами.'),
        author: _t('Замените слова выше уровня {words}{repl} или введите их в словник урока до этого упражнения.'),
        src: 'sol06, с. 90-93; harmer, с. 58-59; scriv, с. 65; celta, Unit 4' },
      { id: 'gram', scope: 'item', kind: 'instr', basis: 'A2', name: _t('Грамматика инструкции'),
        teacher: _t('Повторите инструкцию устно короткими предложениями в повелительном наклонении, без конструкций выше уровня ({gr}).'),
        author: _t('Перестройте инструкцию без конструкций выше уровня ({gr}) – одно предложение на одно действие.'),
        src: 'harmer, с. 58-59; scriv, с. 65; celta, Unit 4' },
      { id: 'split', scope: 'item', kind: 'instr', basis: 'A3', name: _t('Число действий'),
        teacher: _t('Давайте инструкцию по шагам – следующий шаг после того, как учащиеся выполнили предыдущий, а не все действия сразу.'),
        author: _t('Разбейте инструкцию на пронумерованные шаги – одно действие в шаге.'),
        src: 'harmer, с. 58-59; scriv, с. 65; celta, Unit 4' },
      { id: 'short', scope: 'item', kind: 'instr', basis: 'A3', name: _t('Объём инструкции'),
        teacher: _t('Сократите инструкцию при устном повторе до сути задания – что сделать и с каким материалом.'),
        author: _t('Сократите инструкцию – оставьте действие, материал и ожидаемый результат, уберите то, что видно из самого упражнения.'),
        src: 'scriv, с. 65' },
      { id: 'meta', scope: 'item', kind: 'instr', basis: 'A4', name: _t('Метаязык'),
        teacher: _t('Покажите на примере из упражнения, что означают термины {terms}, прежде чем учащиеся начнут работу.'),
        author: _t('Замените термины {terms} описанием действия или добавьте образец выполнения.'),
        src: 'harmer, с. 58-59; scriv, с. 65' },
      { id: 'params', scope: 'item', kind: 'instr', basis: 'D1', name: _t('Параметры выполнения'),
        teacher: _t('Назовите объём высказывания и время на подготовку и выполнение – учащиеся должны знать, какой результат от них ждут.'),
        author: _t('Укажите в инструкции объём высказывания, время или число ответов.'),
        src: 'harmer, с. 59; gez82, с. 312-313' },
      { id: 'ref', scope: 'item', kind: 'instr', basis: 'D3', name: _t('Отсылка'),
        teacher: _t('Уточните для учащихся, к какому упражнению относится отсылка {refs}.'),
        author: _t('Исправьте отсылку {refs} – упражнения с таким номером в уроке нет.'),
        src: '' },
      { id: 'ambig', scope: 'item', kind: 'instr', basis: 'D4', name: _t('Однозначность'),
        teacher: _t('Выполните первый пункт вместе с классом и спросите одного-двух учащихся, что они будут делать, – возможная неоднозначность ({notes}).'),
        author: _t('Устраните неоднозначность ({notes}) и добавьте образец выполнения первого пункта.'),
        src: 'harmer, с. 58-59; scriv, с. 65-66' },
      { id: 'check', scope: 'item', kind: 'instr', basis: 'ISV', name: _t('Проверка понимания'),
        teacher: _t('Инструкция трудна для восприятия (ИСВ {isv}) – покажите выполнение вместо объяснения и проверьте понимание вопросом о том, что нужно сделать.'),
        author: '',
        src: 'harmer, с. 58-59; scriv, с. 65-66' },
      { id: 'pair', scope: 'item', kind: 'instr', basis: 'R6', name: _t('Инструкция сложнее текста'),
        teacher: _t('Инструкция сложнее текста упражнения ({title}) – объясните задание проще, чем оно написано, или покажите его на примере.'),
        author: _t('Упростите инструкцию до уровня текста упражнения ({title}).'),
        src: 'harmer, с. 58-59; scriv, с. 65' },
      /* ---------- упражнение – методическая сторона ---------- */
      { id: 'situation', scope: 'item', kind: 'instr', basis: 'MT', name: _t('Речевая ситуация'),
        teacher: _t('Задайте речевую ситуацию – где и когда идёт общение, кто партнёры, с какой целью они говорят; при возможности создайте информационный разрыв (разные роли на карточках).'),
        author: _t('Дополните задание речевой установкой – место и время, роли партнёров, цель общения, информационный разрыв.'),
        src: 'sol06, с. 46-47, 58; gez82, с. 249-251' },
      { id: 'support', scope: 'item', kind: 'instr', basis: 'MT', name: _t('Опоры'),
        teacher: _t('Дайте опоры для высказывания – ключевые слова, план, образец начала – с учётом уровня группы.'),
        author: _t('Добавьте опоры для высказывания – ключевые слова, план или образец.'),
        src: 'sol06, с. 46, 57-58; gez82, с. 251' },
      /* ---------- упражнение – текст ---------- */
      { id: 'tLex', scope: 'item', kind: 'text', basis: 'T1', name: _t('Лексика текста'),
        teacher: _t('Снимите языковые трудности до чтения или прослушивания – введите слова {words}, без которых задание не выполнить; остальные незнакомые слова оставьте для языковой догадки.'),
        author: _t('Дайте пояснения к словам {words} (сноски, словарик к тексту) или адаптируйте текст.'),
        src: 'sol06, с. 136-138, 161; scriv, с. 194, 196' },
      { id: 'tLevel', scope: 'item', kind: 'text', basis: 'L', name: _t('Уровень текста'),
        teacher: _t('Текст оценён как {est} при заявленном {lv} – выберите задание по силам группе (понимание основного содержания, а не деталей), идите от простого задания к более сложному, длинный текст разделите на части.'),
        author: _t('Адаптируйте текст до уровня {lv} или перенесите его в более поздний урок.'),
        src: 'scriv, с. 256-257; tkt, с. 157' },
      { id: 'tSyn', scope: 'item', kind: 'text', basis: 'T3', name: _t('Синтаксис и грамматика текста'),
        teacher: _t('Если для понимания текста нужны конструкции выше уровня ({gr}), повторите их с группой до работы с текстом.'),
        author: _t('Упростите синтаксис текста – разбейте длинные предложения, сократите число придаточных{gr}.'),
        src: 'sol06, с. 161; tkt, с. 157' },
      { id: 'tSimple', scope: 'item', kind: 'text', basis: 'L', name: _t('Текст проще уровня'),
        teacher: '',
        author: _t('Текст заметно проще заявленного уровня ({est} при {lv}) – для языкового материала проверьте, достаточно ли в нём изучаемых явлений.'),
        src: '' },
      /* ---------- урок – последовательность упражнений ---------- */
      { id: 'jump', scope: 'lesson', basis: 'SEQ', name: _t('Скачок'),
        teacher: _t('Перед Ex. {ex} проведите условно-речевое упражнение на тот же материал – ответы на вопросы по образцу, игра на отгадывание с однотипными вопросами, диалог по опорам, – чтобы учащиеся подошли к речевому заданию подготовленными.'),
        author: _t('Добавьте между Ex. {prev} и Ex. {ex} условно-коммуникативное упражнение на материал урока.'),
        alt: _t('Если урок построен от задания к анализу языка (test-teach-test), порядок оправдан – вернитесь к речевому заданию после тренировки.'),
        src: 'sol06, с. 59, 63, 115-117; gez82, с. 192-193; tkt, с. 156-157; harmer, с. 82-84; scriv, с. 179-180' },
      { id: 'jumpStart', scope: 'lesson', basis: 'SEQ', name: _t('Скачок в начале урока'),
        teacher: _t('Урок открывается речевым заданием Ex. {ex}. Если это не входной срез, перенесите его в конец урока; если срез – повторите задание после тренировки и сравните результат.'),
        author: _t('Перенесите Ex. {ex} после тренировочных упражнений или обозначьте его как входное задание с повторением в конце урока.'),
        src: 'sol06, с. 59, 63; tkt, с. 158; harmer, с. 82-84; scriv, с. 179-180' },
      { id: 'return', scope: 'lesson', basis: 'SEQ', name: _t('Возврат'),
        teacher: _t('Используйте Ex. {ex} как работу над ошибками после речевого задания Ex. {prev} и затем повторите речевое задание.'),
        author: _t('Перенесите Ex. {ex} до речевого задания или обозначьте его как этап анализа языка с повторным выходом в речь.'),
        src: 'sol06, с. 59; harmer, с. 84' },
      { id: 'noApply', scope: 'lesson', basis: 'SEQ', name: _t('Нет выхода в речь'),
        teacher: _t('Завершите урок речевым заданием на материал урока – обсуждение, ролевая игра, опрос – или проверьте, есть ли такое задание в следующем уроке.'),
        author: _t('Добавьте в урок речевое упражнение на этапе применения – с речевой ситуацией и собственной целью высказывания учащихся.'),
        src: 'sol06, с. 47, 115; gez82, с. 193; tkt, с. 158' },
      { id: 'prePhase', scope: 'lesson', basis: 'SEQ', name: _t('Дотекстовый этап'),
        teacher: _t('Перед Ex. {ex} проведите дотекстовый этап – прогнозирование содержания по заголовку или иллюстрации, снятие языковых трудностей, задача для первого прочтения или прослушивания.'),
        author: _t('Добавьте перед Ex. {ex} дотекстовое упражнение – речевая задача для первого прочтения, мотивация, снятие трудностей.'),
        src: 'sol06, с. 136-138, 161-162; scriv, с. 194, 258' },
      { id: 'postOrder', scope: 'lesson', basis: 'SEQ', name: _t('Порядок работы с текстом'),
        teacher: _t('Поменяйте порядок – сначала текстовое задание Ex. {next}, затем послетекстовое Ex. {ex}; перед перестановкой проверьте, не опирается ли одно упражнение на результат другого.'),
        author: _t('Поставьте послетекстовое задание Ex. {ex} после текстового Ex. {next}.'),
        src: 'sol06, с. 161-163; tkt, с. 158' },
      { id: 'unitDrop', scope: 'lesson', basis: 'SEQ', name: _t('От простого к сложному'),
        teacher: '',
        author: _t('Проверьте порядок языковых упражнений – Ex. {ex} работает с меньшей единицей материала, чем Ex. {prev}; система упражнений строится от слова к сверхфразовому единству.'),
        src: 'sol06, с. 59, 93' },
      { id: 'lessonInstr', scope: 'lesson', basis: 'ISV', name: _t('Инструкции урока'),
        teacher: _t('Инструкций урока с ИСВ на пороге и выше – {n} ({list}). Подготовьте устные инструкции заранее – короткие предложения, показ вместо объяснения.'),
        author: '',
        src: 'harmer, с. 58-59; scriv, с. 65; celta, Unit 4' },
      /* ---------- учебник ---------- */
      { id: 'bNoApply', scope: 'book', basis: 'SEQ', name: _t('Выход в речь'),
        teacher: _t('Уроков без речевого задания – {n} из {m} ({list}). Планируйте этап применения сами, опираясь на материал урока.'),
        author: _t('Уроков без этапа применения – {n} из {m} ({list}). Добавьте в них речевые упражнения с речевой ситуацией.'),
        src: 'sol06, с. 47, 115; gez82, с. 193' },
      { id: 'bJump', scope: 'book', basis: 'SEQ', name: _t('Условно-речевые упражнения'),
        teacher: _t('Уроков, где речевое задание идёт без условно-речевой подготовки, – {n} ({list}). Держите наготове вопросно-ответные упражнения и диалоги по образцу на материал урока.'),
        author: _t('Уроков без условно-коммуникативных упражнений между языковыми и речевыми – {n} ({list}). Добавьте их на материал урока.'),
        src: 'sol06, с. 59, 115-117; gez82, с. 192-193' },
      { id: 'bPre', scope: 'book', basis: 'SEQ', name: _t('Работа с текстом'),
        teacher: _t('Уроков, где задания к тексту идут без дотекстового этапа, – {n} ({list}). Начинайте работу с текстом с прогнозирования содержания и снятия трудностей.'),
        author: _t('Уроков без дотекстовых заданий – {n} ({list}). Добавьте задания, которые ставят речевую задачу для первого прочтения и снимают трудности.'),
        src: 'sol06, с. 136-138, 161-162' },
      { id: 'bInstr', scope: 'book', basis: 'ISV', name: _t('Инструкции'),
        teacher: _t('Инструкций с ИСВ на пороге и выше – {n} из {m} ({p}). Планируйте устные инструкции заранее и проверяйте понимание задания.'),
        author: _t('Инструкций с ИСВ на пороге и выше – {n} из {m} ({p}). При переработке начните с самых частых слов выше уровня ({words}).'),
        src: 'harmer, с. 58-59; scriv, с. 65-66; celta, Unit 4' },
      { id: 'bMeta', scope: 'book', basis: 'A4', name: _t('Метаязык'),
        teacher: _t('Введите термины {terms} на примерах при первом появлении и далее используйте их единообразно.'),
        author: _t('Термины {terms} появляются раньше, чем допускает уровень, – замените их описанием действия или добавьте образец.'),
        src: 'harmer, с. 58-59; scriv, с. 65' },
      { id: 'bUniform', scope: 'book', basis: 'A5', name: _t('Единообразие формулировок'),
        teacher: '',
        author: _t('Для действия «{type}» число разных формулировок – {k} ({keys}). Выберите одну основную.'),
        src: '' },
      { id: 'bParams', scope: 'book', basis: 'D1', name: _t('Параметры выполнения'),
        teacher: _t('Продуктивных заданий без объёма, времени или числа ответов – {n}. Называйте эти параметры сами.'),
        author: _t('Продуктивных заданий без объёма, времени или числа ответов – {n}. Укажите эти параметры в инструкциях.'),
        src: 'harmer, с. 59; gez82, с. 312-313' },
      { id: 'bSituation', scope: 'book', basis: 'MT', name: _t('Речевая ситуация'),
        teacher: _t('Речевых заданий без речевой ситуации – {n}. Дополняйте их ролями, целью общения и информационным разрывом.'),
        author: _t('Речевых заданий без речевой ситуации – {n}. Дополните их речевой установкой – место, роли, цель общения.'),
        src: 'sol06, с. 46-47; gez82, с. 249-251' },
      { id: 'bTexts', scope: 'book', basis: 'L', name: _t('Тексты'),
        teacher: _t('Текстов выше заявленного уровня – {n} из {m}. Снимайте трудности до чтения и подбирайте задание по силам группе.'),
        author: _t('Текстов выше заявленного уровня – {n} из {m}. Адаптируйте их или дайте словарик к тексту.'),
        src: 'sol06, с. 161; scriv, с. 194, 256; tkt, с. 157' },
      { id: 'bPairs', scope: 'book', basis: 'R6', name: _t('Инструкции к текстам'),
        teacher: _t('Пар, в которых инструкция сложнее своего текста, – {n}. Объясняйте такие задания проще, чем они написаны.'),
        author: _t('Пар, в которых инструкция сложнее своего текста, – {n}. Упростите инструкции до уровня текстов.'),
        src: 'harmer, с. 58-59; scriv, с. 65' }
    ]
  };

  g.IA_RES = R;
})(typeof window !== 'undefined' ? window : globalThis);
