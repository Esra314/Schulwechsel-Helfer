/*
 * Frage-Helfer: vorbereitete Antworten in 6 Sprachen (keine KI, nichts wird gesendet).
 *
 * Aufbau eines Themas:
 *   id      eindeutiger Name
 *   links   Knöpfe unter der Antwort (siehe LINKS in js/assistent.js)
 *   faq     optional: Frage und Antwort kommen aus js/i18n.js (faq_qN / faq_aN),
 *           damit dieselben Texte nicht doppelt gepflegt werden
 *   de/en/… { q: Frage (für die Themen-Knöpfe), a: Antwort, w: Suchwörter }
 *
 * Suchwörter: Groß-/Kleinschreibung und Akzente sind egal. Ein Wort passt auch,
 * wenn die Frage länger ist ("durchschnitt" passt zu "Durchschnittsnote").
 * "~wort" zählt wenig (allgemeines Wort), "!wort" zählt viel (sehr eindeutig).
 * Schularten und Fächer bleiben in allen Sprachen auf Deutsch (wie im Zeugnis).
 */
(function (root) {
    "use strict";

    var UI = {
        de: {
            open: "Frage-Assistent",
            title: "Frage-Assistent",
            sub: "Schnelle Antworten · ohne KI · nichts wird gesendet",
            placeholder: "Ihre Frage …",
            send: "Senden",
            close: "Schließen",
            restart: "Neu starten",
            topics: "Beliebte Themen",
            more: "Passt vielleicht auch:",
            hello: "Hallo! 👋 Ich bin der Frage-Assistent. Ich beantworte kurze Fragen zum Wechsel auf die Oberschule in Berlin. Schreiben Sie Ihre Frage oder tippen Sie auf ein Thema.",
            unknown: "Dazu habe ich leider keine passende Antwort. 🙈 Ich kenne mich nur mit dem Wechsel auf die Oberschule in Berlin aus. Vielleicht hilft eines dieser Themen oder die offizielle Seite:",
            note: "Vorbereitete Antworten, ohne Gewähr. Verbindlich ist die Grundschule."
        },
        en: {
            open: "Question assistant",
            title: "Question assistant",
            sub: "Quick answers · no AI · nothing is sent",
            placeholder: "Your question …",
            send: "Send",
            close: "Close",
            restart: "Start over",
            topics: "Popular topics",
            more: "This might also help:",
            hello: "Hi! 👋 I'm the question assistant. I answer short questions about moving on to secondary school (Oberschule) in Berlin. Type your question or tap a topic.",
            unknown: "Sorry, I don't have an answer for that. 🙈 I only know about moving on to secondary school in Berlin. Maybe one of these topics or the official page helps:",
            note: "Prepared answers, no guarantee. The primary school has the final word."
        },
        tr: {
            open: "Soru asistanı",
            title: "Soru asistanı",
            sub: "Hızlı cevaplar · yapay zekâ yok · hiçbir şey gönderilmez",
            placeholder: "Sorunuz …",
            send: "Gönder",
            close: "Kapat",
            restart: "Yeniden başla",
            topics: "Sık sorulan konular",
            more: "Bunlar da işinize yarayabilir:",
            hello: "Merhaba! 👋 Ben soru asistanıyım. Berlin'de ortaokula (Oberschule) geçişle ilgili kısa soruları cevaplıyorum. Sorunuzu yazın ya da bir konuya dokunun.",
            unknown: "Maalesef buna uygun bir cevabım yok. 🙈 Yalnızca Berlin'de ortaokula geçiş konusunu biliyorum. Belki şu konulardan biri ya da resmî sayfa yardımcı olur:",
            note: "Hazır cevaplar, garanti verilmez. Bağlayıcı olan ilkokulun söyledikleridir."
        },
        ar: {
            open: "مساعد الأسئلة",
            title: "مساعد الأسئلة",
            sub: "إجابات سريعة · بدون ذكاء اصطناعي · لا يُرسل أي شيء",
            placeholder: "سؤالك …",
            send: "إرسال",
            close: "إغلاق",
            restart: "البدء من جديد",
            topics: "مواضيع شائعة",
            more: "قد يفيدك أيضاً:",
            hello: "مرحباً! 👋 أنا مساعد الأسئلة. أجيب عن أسئلة قصيرة حول الانتقال إلى المدرسة الثانوية (Oberschule) في برلين. اكتب سؤالك أو اضغط على أحد المواضيع.",
            unknown: "للأسف ليس لدي إجابة مناسبة لهذا. 🙈 أعرف فقط موضوع الانتقال إلى المدرسة الثانوية في برلين. ربما يساعدك أحد هذه المواضيع أو الصفحة الرسمية:",
            note: "إجابات معدّة مسبقاً، بدون ضمان. القرار الملزم للمدرسة الابتدائية."
        },
        uk: {
            open: "Помічник з питань",
            title: "Помічник з питань",
            sub: "Швидкі відповіді · без ШІ · нічого не надсилається",
            placeholder: "Ваше питання …",
            send: "Надіслати",
            close: "Закрити",
            restart: "Почати знову",
            topics: "Популярні теми",
            more: "Можливо, допоможе ще:",
            hello: "Привіт! 👋 Я помічник з питань. Відповідаю на короткі питання про перехід до середньої школи (Oberschule) у Берліні. Напишіть питання або натисніть на тему.",
            unknown: "На жаль, на це в мене немає відповіді. 🙈 Я знаю лише про перехід до середньої школи в Берліні. Можливо, допоможе одна з цих тем або офіційна сторінка:",
            note: "Підготовлені відповіді, без гарантії. Остаточне слово за початковою школою."
        },
        ru: {
            open: "Помощник",
            title: "Помощник по вопросам",
            sub: "Быстрые ответы · без ИИ · ничего не отправляется",
            placeholder: "Ваш вопрос …",
            send: "Отправить",
            close: "Закрыть",
            restart: "Начать заново",
            topics: "Популярные темы",
            more: "Возможно, поможет ещё:",
            hello: "Привет! 👋 Я помощник по вопросам. Отвечаю на короткие вопросы о переходе в среднюю школу (Oberschule) в Берлине. Напишите вопрос или нажмите на тему.",
            unknown: "К сожалению, на это у меня нет ответа. 🙈 Я знаю только о переходе в среднюю школу в Берлине. Возможно, поможет одна из этих тем или официальная страница:",
            note: "Подготовленные ответы, без гарантии. Окончательное слово за начальной школой."
        }
    };

    /*
     * Kleine Gespräche: Begrüßung, Dank usw. Wird zusammen mit einer echten
     * Frage erkannt ("Hallo, wann ist die Anmeldung?"), kommt nur die Antwort
     * zum Thema, mit einem kurzen Gruß davor.
     */
    var SMALLTALK = [
        {
            id: "gruss",
            de: { a: "Hallo! 😊 Schön, dass Sie da sind. Was möchten Sie wissen?", kurz: "Hallo! 😊", w: ["!hallo", "!hi", "!hey", "!moin", "guten tag", "guten morgen", "guten abend", "servus", "!huhu", "na du"] },
            en: { a: "Hi! 😊 Nice to have you here. What would you like to know?", kurz: "Hi! 😊", w: ["!hello", "!hi", "!hey", "good morning", "good evening", "good afternoon", "hiya"] },
            tr: { a: "Merhaba! 😊 Hoş geldiniz. Ne öğrenmek istersiniz?", kurz: "Merhaba! 😊", w: ["!merhaba", "!selam", "selamlar", "slm", "mrb", "iyi gunler", "gunaydin", "iyi aksamlar", "selamun aleykum", "hosgeldin"] },
            ar: { a: "مرحباً! 😊 أهلاً بك. ماذا تريد أن تعرف؟", kurz: "مرحباً! 😊", w: ["!مرحبا", "!اهلا", "!السلام عليكم", "!سلام", "صباح الخير", "مساء الخير", "هلا"] },
            uk: { a: "Привіт! 😊 Раді вас бачити. Що б ви хотіли дізнатися?", kurz: "Привіт! 😊", w: ["!привіт", "!вітаю", "добрий день", "доброго дня", "добрий ранок", "добрий вечір", "здрастуйте"] },
            ru: { a: "Привет! 😊 Рады вас видеть. Что вы хотели бы узнать?", kurz: "Привет! 😊", w: ["!привет", "!здравствуйте", "добрый день", "доброе утро", "добрый вечер", "здрасте", "приветствую"] }
        },
        {
            id: "befinden",
            de: { a: "Mir geht's gut, danke der Nachfrage! 😊 Und ich bin bereit für Ihre Fragen. Worum geht es?", w: ["!wie geht", "!wie gehts", "alles gut", "alles klar bei dir", "wie lauft"] },
            en: { a: "I'm doing great, thanks for asking! 😊 And I'm ready for your questions. What's it about?", w: ["!how are you", "!how r u", "how is it going", "hows it going", "whats up", "how are u"] },
            tr: { a: "İyiyim, sorduğunuz için teşekkürler! 😊 Sorularınız için hazırım. Ne hakkında?", w: ["!nasilsin", "!nasilsiniz", "naber", "ne haber", "nasil gidiyor", "iyi misin", "keyfin nasil"] },
            ar: { a: "أنا بخير، شكراً لسؤالك! 😊 وأنا جاهز لأسئلتك. عن ماذا تريد أن تسأل؟", w: ["!كيف حالك", "!كيفك", "كيف الحال", "شلونك", "ازيك", "كيف حالكم"] },
            uk: { a: "У мене все добре, дякую, що питаєте! 😊 Я готовий до ваших питань. Про що йдеться?", w: ["!як справи", "!як ти", "як у тебе справи", "як ся маєш", "як поживаєш"] },
            ru: { a: "У меня всё хорошо, спасибо, что спросили! 😊 Я готов к вашим вопросам. О чём речь?", w: ["!как дела", "!как ты", "как поживаешь", "как жизнь", "как у тебя дела"] }
        },
        {
            id: "frage",
            de: { a: "Klar, fragen Sie ruhig! ✍️ Schreiben Sie Ihre Frage einfach unten hinein oder tippen Sie auf ein Thema.", w: ["!ich habe eine frage", "!habe eine frage", "!hab eine frage", "!hab ne frage", "!eine frage", "kann ich was fragen", "kann ich etwas fragen", "darf ich fragen", "!frage", "hilfe", "kannst du mir helfen", "konnen sie mir helfen"] },
            en: { a: "Sure, go ahead! ✍️ Just type your question below or tap a topic.", w: ["!i have a question", "!a question", "!question", "can i ask", "may i ask", "help", "can you help"] },
            tr: { a: "Tabii, sorun lütfen! ✍️ Sorunuzu aşağıya yazın ya da bir konuya dokunun.", w: ["!bir sorum var", "!sorum var", "!soru sorabilir miyim", "!soru", "sorum olacak", "bir sey soracagim", "bisey sorcam", "yardim", "yardim eder misin", "yardimci olur musun"] },
            ar: { a: "بالتأكيد، تفضّل بالسؤال! ✍️ اكتب سؤالك في الأسفل أو اضغط على أحد المواضيع.", w: ["!عندي سؤال", "!لدي سؤال", "!سؤال", "ممكن اسأل", "هل يمكنني السؤال", "مساعدة", "ساعدني"] },
            uk: { a: "Звісно, питайте! ✍️ Напишіть питання внизу або натисніть на тему.", w: ["!у мене питання", "!маю питання", "!питання", "можна запитати", "допоможіть", "допомога"] },
            ru: { a: "Конечно, спрашивайте! ✍️ Напишите вопрос внизу или нажмите на тему.", w: ["!у меня вопрос", "!есть вопрос", "!вопрос", "можно спросить", "помогите", "помощь"] }
        },
        {
            id: "danke",
            de: { a: "Gern geschehen! 🌟 Viel Erfolg bei der Schulwahl – jeder Weg kann zum Ziel führen.", w: ["!danke", "!dankeschon", "vielen dank", "!merci", "super danke", "toll", "!thx"] },
            en: { a: "You're welcome! 🌟 Good luck choosing a school – every path can lead to the goal.", w: ["!thanks", "!thank you", "!thx", "great", "awesome", "cheers"] },
            tr: { a: "Rica ederim! 🌟 Okul seçiminde bol şans – her yol hedefe götürebilir.", w: ["!tesekkur", "!tesekkurler", "!sagol", "!sagolun", "!eyvallah", "cok iyi", "harika", "super"] },
            ar: { a: "على الرحب والسعة! 🌟 بالتوفيق في اختيار المدرسة – كل طريق يمكن أن يوصل إلى الهدف.", w: ["!شكرا", "!شكراً", "شكرا جزيلا", "!مشكور", "يعطيك العافية", "ممتاز"] },
            uk: { a: "Будь ласка! 🌟 Успіхів у виборі школи – кожен шлях може привести до мети.", w: ["!дякую", "!дякуємо", "!спасибі", "чудово", "супер"] },
            ru: { a: "Пожалуйста! 🌟 Удачи в выборе школы – каждый путь может привести к цели.", w: ["!спасибо", "!благодарю", "отлично", "супер", "класс"] }
        },
        {
            id: "tschuess",
            de: { a: "Tschüss und viel Erfolg! 👋 Sie können jederzeit wiederkommen.", w: ["!tschuss", "!tschau", "!ciao", "auf wiedersehen", "bis bald", "bis dann", "!bye"] },
            en: { a: "Bye and good luck! 👋 Come back any time.", w: ["!bye", "!goodbye", "see you", "see ya", "cya"] },
            tr: { a: "Hoşça kalın, bol şans! 👋 İstediğiniz zaman tekrar gelebilirsiniz.", w: ["!hoscakal", "!gorusuruz", "!bye", "allaha emanet", "iyi geceler", "kendine iyi bak"] },
            ar: { a: "مع السلامة وبالتوفيق! 👋 يمكنك العودة في أي وقت.", w: ["!مع السلامة", "!وداعا", "الى اللقاء", "باي", "تصبح على خير"] },
            uk: { a: "До побачення і успіхів! 👋 Повертайтеся будь-коли.", w: ["!до побачення", "!бувай", "!па-па", "на все добре", "до зустрічі"] },
            ru: { a: "До свидания и удачи! 👋 Возвращайтесь в любое время.", w: ["!до свидания", "!пока", "всего доброго", "до встречи", "счастливо"] }
        },
        {
            id: "wer",
            de: { a: "Ich bin der kleine Frage-Assistent dieser Seite. Ich bin keine KI: Ich suche zu Ihrer Frage die passende vorbereitete Antwort. Ihre Fragen bleiben auf Ihrem Gerät. 🔒", w: ["!wer bist du", "!was bist du", "bist du ein bot", "bist du eine ki", "bist du ein mensch", "chatgpt", "!roboter"] },
            en: { a: "I'm the small question assistant on this page. I'm not an AI: I look for the prepared answer that fits your question. Your questions stay on your device. 🔒", w: ["!who are you", "!what are you", "are you a bot", "are you an ai", "are you human", "chatgpt", "!robot"] },
            tr: { a: "Ben bu sayfanın küçük soru asistanıyım. Yapay zekâ değilim: Sorunuza uyan hazır cevabı buluyorum. Sorularınız cihazınızda kalır. 🔒", w: ["!sen kimsin", "!kimsin", "!nesin", "bot musun", "yapay zeka misin", "insan misin", "chatgpt", "!robot"] },
            ar: { a: "أنا مساعد أسئلة صغير في هذه الصفحة. لست ذكاءً اصطناعياً: أبحث عن الإجابة المعدّة المناسبة لسؤالك. أسئلتك تبقى على جهازك. 🔒", w: ["!من انت", "!ما انت", "هل انت روبوت", "هل انت ذكاء اصطناعي", "هل انت انسان", "chatgpt"] },
            uk: { a: "Я маленький помічник з питань на цій сторінці. Я не ШІ: я шукаю підготовлену відповідь, що підходить до вашого питання. Ваші питання залишаються на вашому пристрої. 🔒", w: ["!хто ти", "!що ти таке", "ти бот", "ти робот", "ти штучний інтелект", "chatgpt"] },
            ru: { a: "Я маленький помощник по вопросам на этой странице. Я не ИИ: я ищу подготовленный ответ, который подходит к вашему вопросу. Ваши вопросы остаются на вашем устройстве. 🔒", w: ["!кто ты", "!что ты такое", "ты бот", "ты робот", "ты искусственный интеллект", "chatgpt"] }
        },
        {
            id: "ok",
            de: { a: "Prima! 👍 Haben Sie noch eine Frage?", w: ["!ok", "!okay", "!ja", "!alles klar", "!verstanden", "!gut", "!cool", "!aha", "!ach so"] },
            en: { a: "Great! 👍 Do you have another question?", w: ["!ok", "!okay", "!yes", "!got it", "!cool", "!i see", "!alright"] },
            tr: { a: "Harika! 👍 Başka bir sorunuz var mı?", w: ["!tamam", "!ok", "!okey", "!evet", "!anladim", "!peki", "!iyi"] },
            ar: { a: "رائع! 👍 هل لديك سؤال آخر؟", w: ["!حسنا", "!تمام", "!اوكي", "!نعم", "!فهمت", "!طيب"] },
            uk: { a: "Чудово! 👍 Маєте ще питання?", w: ["!добре", "!ок", "!так", "!зрозуміло", "!ясно", "!гаразд"] },
            ru: { a: "Отлично! 👍 Есть ещё вопрос?", w: ["!хорошо", "!ок", "!да", "!понятно", "!ясно", "!ладно"] }
        }
    ];

    var THEMEN = [
        {
            id: "durchschnitt",
            links: ["calc"],
            de: {
                q: "Wie wird der Durchschnitt berechnet?",
                a: "Alle Fächer aus den Zeugnissen 5/2 und 6/1 zählen. Deutsch, Mathematik, 1. Fremdsprache, Naturwissenschaften und Gesellschaftswissenschaften zählen doppelt, Kunst, Musik und Sport einfach.\nDie Summe wird durch die Zahl der Gewichte geteilt und nach einer Stelle hinter dem Komma abgeschnitten, nicht gerundet.\nBeispiel: 67 : 26 = 2,57… → 2,5",
                w: ["!durchschnitt", "!schnitt", "!notendurchschnitt", "durchschnittsnote", "berechnen", "berechnet", "ausrechnen", "rechnen", "doppelt", "gewichtet", "gerundet", "runden", "komma", "~noten"]
            },
            en: {
                q: "How is the average calculated?",
                a: "All subjects from the reports 5/2 and 6/1 count. Deutsch, Mathematik, 1. Fremdsprache, Naturwissenschaften and Gesellschaftswissenschaften count double, Kunst, Musik and Sport count once.\nThe total is divided by the number of weights and cut after one decimal place, not rounded.\nExample: 67 : 26 = 2.57… → 2.5",
                w: ["!average", "!avg", "!grade average", "calculate", "calculated", "compute", "double", "weighted", "rounded", "round", "decimal", "~grades"]
            },
            tr: {
                q: "Ortalama nasıl hesaplanır?",
                a: "5/2 ve 6/1 karnelerindeki tüm dersler sayılır. Deutsch, Mathematik, 1. Fremdsprache, Naturwissenschaften ve Gesellschaftswissenschaften iki kat, Kunst, Musik ve Sport bir kat sayılır.\nToplam, ağırlık sayısına bölünür ve virgülden sonra tek basamakta kesilir, yuvarlanmaz.\nÖrnek: 67 : 26 = 2,57… → 2,5",
                w: ["!ortalama", "!ortalamasi", "!not ortalamasi", "!ort", "hesap", "hesaplanir", "hesaplama", "nasil hesap", "iki kat", "cift", "yuvarla", "virgul", "~not"]
            },
            ar: {
                q: "كيف يُحسب المعدل؟",
                a: "تُحسب جميع المواد من شهادتي 5/2 و6/1. مواد Deutsch وMathematik و1. Fremdsprache وNaturwissenschaften وGesellschaftswissenschaften تُحسب مرتين، وKunst وMusik وSport مرة واحدة.\nيُقسم المجموع على عدد الأوزان ويُقطع بعد خانة عشرية واحدة، بدون تقريب.\nمثال: 67 : 26 = 2,57… ← 2,5",
                w: ["!المعدل", "!معدل", "!متوسط", "حساب", "يحسب", "احسب", "مرتين", "تقريب", "فاصلة", "~درجات", "~علامات"]
            },
            uk: {
                q: "Як рахується середня оцінка?",
                a: "Рахуються всі предмети з табелів 5/2 і 6/1. Deutsch, Mathematik, 1. Fremdsprache, Naturwissenschaften і Gesellschaftswissenschaften рахуються двічі, Kunst, Musik і Sport один раз.\nСуму ділять на кількість ваг і обрізають після одного знака після коми, без округлення.\nПриклад: 67 : 26 = 2,57… → 2,5",
                w: ["!середня", "!середній бал", "!середню", "рахувати", "рахується", "розрахувати", "обчислити", "двічі", "округл", "кома", "~оцінки"]
            },
            ru: {
                q: "Как считается средний балл?",
                a: "Считаются все предметы из табелей 5/2 и 6/1. Deutsch, Mathematik, 1. Fremdsprache, Naturwissenschaften и Gesellschaftswissenschaften считаются дважды, Kunst, Musik и Sport один раз.\nСумму делят на количество весов и обрезают после одного знака после запятой, без округления.\nПример: 67 : 26 = 2,57… → 2,5",
                w: ["!средний", "!средний балл", "!среднюю", "считать", "считается", "рассчитать", "посчитать", "вычислить", "дважды", "округл", "запятой", "~оценки"]
            }
        },
        {
            id: "eignung",
            links: ["calc"],
            de: {
                q: "Ist das Gymnasium möglich?",
                a: "Das zeigt die Notensumme: Deutsch + Mathematik + 1. Fremdsprache aus den Zeugnissen 5/2 und 6/1, also 6 Noten.\nBis 14: Das Gymnasium ist direkt möglich.\nÜber 14: Der Weg ans Gymnasium geht über den Probeunterricht.\nISS und Gemeinschaftsschule stehen allen offen und führen genauso zum Abitur. 🎓",
                w: ["!eignung", "!geeignet", "!gymnasialeignung", "!notensumme", "!gymnasialempfehlung", "empfehlung", "summe", "!14", "aufs gymnasium", "ans gymnasium", "zum gymnasium", "fur das gymnasium", "furs gymnasium", "schafft", "reicht", "~gymnasium", "darf mein kind", "~was brauche", "~was braucht", "voraussetzung", "welche noten", "bedingung"]
            },
            en: {
                q: "Is the Gymnasium possible?",
                a: "The grade total (Notensumme) shows it: Deutsch + Mathematik + 1. Fremdsprache from the reports 5/2 and 6/1, so 6 grades.\nUp to 14: the Gymnasium is possible directly.\nAbove 14: the way to the Gymnasium is through the Probeunterricht.\nISS and Gemeinschaftsschule are open to everyone and lead to the Abitur just the same. 🎓",
                w: ["!eligible", "!eligibility", "!suitable", "!notensumme", "!grade total", "!sum of grades", "recommendation", "!14", "get into", "go to gymnasium", "enough", "~gymnasium", "qualify", "what do i need", "what does my child need", "requirement", "what grades"]
            },
            tr: {
                q: "Gymnasium mümkün mü?",
                a: "Bunu not toplamı (Notensumme) gösterir: 5/2 ve 6/1 karnelerinden Deutsch + Mathematik + 1. Fremdsprache, yani 6 not.\n14'e kadar: Gymnasium doğrudan mümkün.\n14'ün üzerinde: Gymnasium'a yol Probeunterricht üzerinden geçer.\nISS ve Gemeinschaftsschule herkese açıktır ve aynı şekilde Abitur'a götürür. 🎓",
                w: ["!eignung", "!uygun mu", "!uygunluk", "!not toplami", "!notensumme", "!toplam", "tavsiye", "!14", "gymnasiuma gidebilir", "gymnasiuma girebilir", "gidebilir mi", "girebilir mi", "yeter mi", "yetiyor mu", "~gymnasium", "~gimnazyum", "ne lazim", "ne gerek", "hangi not", "sart"]
            },
            ar: {
                q: "هل الـ Gymnasium ممكن؟",
                a: "يُظهر ذلك مجموع الدرجات (Notensumme): Deutsch + Mathematik + 1. Fremdsprache من شهادتي 5/2 و6/1، أي 6 درجات.\nحتى 14: الـ Gymnasium ممكن مباشرة.\nأكثر من 14: الطريق إلى الـ Gymnasium عبر الـ Probeunterricht.\nالـ ISS والـ Gemeinschaftsschule مفتوحتان للجميع وتؤديان بالمثل إلى الـ Abitur. 🎓",
                w: ["!الاهلية", "!مؤهل", "!مناسب", "!مجموع الدرجات", "!notensumme", "!مجموع", "توصية", "!14", "يكفي", "هل يمكن", "~gymnasium", "~جمنازيوم", "ماذا يحتاج", "ماذا احتاج", "شروط", "متطلبات"]
            },
            uk: {
                q: "Чи можна до Gymnasium?",
                a: "Це показує сума оцінок (Notensumme): Deutsch + Mathematik + 1. Fremdsprache з табелів 5/2 і 6/1, тобто 6 оцінок.\nДо 14: Gymnasium можливий одразу.\nБільше 14: шлях до Gymnasium через Probeunterricht.\nISS і Gemeinschaftsschule відкриті для всіх і так само ведуть до Abitur. 🎓",
                w: ["!придатн", "!підходить", "!сума оцінок", "!notensumme", "!сума", "рекомендац", "!14", "вистачить", "чи можна", "чи може", "~gymnasium", "~гімназ", "що потрібно", "що треба", "умови", "які оцінки"]
            },
            ru: {
                q: "Можно ли в Gymnasium?",
                a: "Это показывает сумма оценок (Notensumme): Deutsch + Mathematik + 1. Fremdsprache из табелей 5/2 и 6/1, то есть 6 оценок.\nДо 14: Gymnasium возможен сразу.\nБольше 14: путь в Gymnasium через Probeunterricht.\nISS и Gemeinschaftsschule открыты для всех и так же ведут к Abitur. 🎓",
                w: ["!пригодн", "!подходит", "!сумма оценок", "!notensumme", "!сумма", "рекомендац", "!14", "хватит", "можно ли", "может ли", "~gymnasium", "~гимназ", "что нужно", "что надо", "условия", "какие оценки"]
            }
        },
        {
            id: "foerderprognose",
            links: ["calc", "dates"],
            de: {
                q: "Was ist die Förderprognose?",
                a: "Die Förderprognose gibt es von der Grundschule mit dem Halbjahreszeugnis 6/1, meist Ende Januar. Darin stehen Notensumme, Durchschnitt und eine Empfehlung für die Schulart, dazu gibt es ein Beratungsgespräch.\nVerbindlich ist nur die Förderprognose der Grundschule. Dieser Rechner hilft, schon vorher zu sehen, wo man steht.",
                w: ["!forderprognose", "!prognose", "!foerderprognose", "gutachten", "beratungsgesprach", "halbjahreszeugnis", "~zeugnis", "~grundschule"]
            },
            en: {
                q: "What is the Förderprognose?",
                a: "The primary school gives the Förderprognose together with the half-year report 6/1, usually at the end of January. It shows the grade total, the average and a recommendation for the school type, and there is a counselling talk.\nOnly the primary school's Förderprognose is binding. This calculator helps you see in advance where you stand.",
                w: ["!forderprognose", "!foerderprognose", "!prognosis", "!forecast", "report card", "counselling", "~report", "~primary school"]
            },
            tr: {
                q: "Förderprognose nedir?",
                a: "Förderprognose, ilkokul tarafından 6/1 dönem karnesiyle birlikte, genellikle Ocak sonunda verilir. İçinde not toplamı, ortalama ve okul türü için bir tavsiye bulunur; ayrıca bir danışma görüşmesi yapılır.\nBağlayıcı olan yalnızca ilkokulun Förderprognose'udur. Bu hesaplayıcı, önceden nerede durduğunuzu görmenize yardım eder.",
                w: ["!forderprognose", "!foerderprognose", "!prognoz", "!tavsiye mektubu", "danisma", "~karne", "~ilkokul"]
            },
            ar: {
                q: "ما هي الـ Förderprognose؟",
                a: "تعطي المدرسة الابتدائية الـ Förderprognose مع شهادة نصف السنة 6/1، غالباً في نهاية يناير. فيها مجموع الدرجات والمعدل وتوصية بنوع المدرسة، مع جلسة استشارة.\nالملزم فقط هو الـ Förderprognose من المدرسة الابتدائية. تساعدك هذه الحاسبة على معرفة وضعك مسبقاً.",
                w: ["!forderprognose", "!foerderprognose", "!التوقع", "!تقييم", "استشارة", "~الشهادة", "~الابتدائية"]
            },
            uk: {
                q: "Що таке Förderprognose?",
                a: "Förderprognose видає початкова школа разом із табелем за півріччя 6/1, зазвичай наприкінці січня. У ній є сума оцінок, середня оцінка й рекомендація щодо типу школи, а також консультація.\nОбов'язковою є лише Förderprognose початкової школи. Цей калькулятор допомагає заздалегідь побачити, де ви зараз.",
                w: ["!forderprognose", "!foerderprognose", "!прогноз", "консультац", "~табель", "~початков"]
            },
            ru: {
                q: "Что такое Förderprognose?",
                a: "Förderprognose выдаёт начальная школа вместе с табелем за полугодие 6/1, обычно в конце января. В ней есть сумма оценок, средний балл и рекомендация по типу школы, а также консультация.\nОбязательна только Förderprognose начальной школы. Этот калькулятор помогает заранее увидеть, где вы сейчас.",
                w: ["!forderprognose", "!foerderprognose", "!прогноз", "консультац", "~табель", "~начальн"]
            }
        },
        {
            id: "auswahl",
            links: ["find"],
            de: {
                q: "Wofür zählt der Durchschnitt?",
                a: "Der Durchschnitt entscheidet nicht über die Eignung. Er zählt nur, wenn sich an einer Schule mehr Kinder anmelden, als es Plätze gibt.\nDann vergibt die Schule die Plätze nach Härtefällen, nach eigenen Kriterien (oft dem Durchschnitt) und zum Teil per Los. Darum lohnt es sich, auch Zweit- und Drittwunsch gut zu wählen.",
                w: ["!wofur", "!wozu", "!platze", "!platz bekommen", "!schulplatz", "!ubernachgefragt", "zu viele", "mehr anmeldungen", "!los", "!losverfahren", "!hartefall", "kriterien", "aufnahme", "warum durchschnitt", "~durchschnitt"]
            },
            en: {
                q: "What is the average used for?",
                a: "The average does not decide eligibility. It only counts when more children apply to a school than there are places.\nThen the school gives places to hardship cases, by its own criteria (often the average) and partly by lottery. That's why it's worth choosing your 2nd and 3rd choice carefully too.",
                w: ["!what for", "!used for", "!places", "!school place", "!oversubscribed", "too many", "more applications", "!lottery", "!hardship", "criteria", "admission", "why average", "~average"]
            },
            tr: {
                q: "Ortalama ne işe yarar?",
                a: "Ortalama uygunluğa karar vermez. Yalnızca bir okula yer sayısından fazla çocuk başvurduğunda önem kazanır.\nO zaman okul yerleri zorunlu durumlara (Härtefall), kendi kriterlerine (çoğu zaman ortalamaya) ve kısmen kuraya göre verir. Bu yüzden 2. ve 3. tercihi de iyi seçmek önemlidir.",
                w: ["!ne ise yarar", "!neden onemli", "!ne icin", "!kontenjan", "!yer var mi", "!okulda yer", "cok basvuru", "fazla basvuru", "!kura", "!harte", "kriter", "kabul", "~ortalama"]
            },
            ar: {
                q: "ما فائدة المعدل؟",
                a: "المعدل لا يقرر الأهلية. يُحسب فقط عندما يتقدم إلى مدرسة عدد من الأطفال أكبر من عدد الأماكن.\nعندها تعطي المدرسة الأماكن لحالات الضرورة، وحسب معاييرها الخاصة (غالباً المعدل)، وجزئياً بالقرعة. لذلك من المهم اختيار الرغبة الثانية والثالثة بعناية أيضاً.",
                w: ["!ما فائدة", "!لماذا المعدل", "!الاماكن", "!مقعد", "!القرعة", "قرعة", "كثير من الطلبات", "معايير", "قبول", "~المعدل"]
            },
            uk: {
                q: "Для чого потрібна середня оцінка?",
                a: "Середня оцінка не вирішує, чи дитина придатна. Вона важлива лише тоді, коли до школи подається більше дітей, ніж є місць.\nТоді школа розподіляє місця для особливих випадків, за своїми критеріями (часто за середньою оцінкою) і частково жеребкуванням. Тому варто добре обрати і 2-й, і 3-й вибір.",
                w: ["!для чого", "!навіщо", "!місця", "!місце в школі", "!жереб", "забагато", "більше заяв", "критері", "прийом", "~середня"]
            },
            ru: {
                q: "Для чего нужен средний балл?",
                a: "Средний балл не решает, подходит ли ребёнок. Он важен только тогда, когда в школу подаётся больше детей, чем есть мест.\nТогда школа распределяет места для особых случаев, по своим критериям (часто по среднему баллу) и частично по жребию. Поэтому стоит хорошо выбрать и 2-й, и 3-й выбор.",
                w: ["!для чего", "!зачем", "!места", "!место в школе", "!жреб", "лотере", "слишком много", "больше заявлений", "критери", "приём", "прием", "~средний"]
            }
        },
        {
            id: "tendenz",
            links: ["calc"],
            de: {
                q: "Zählen 2+ oder 3- anders?",
                a: "Nein. Plus und Minus (Tendenzen) zählen als ganze Note: 2+ und 2- sind beide eine 2.\nBei Zwischennoten wie „2-3“ gelten Sonderregeln. Da hilft die Grundschule weiter.",
                w: ["!plus", "!minus", "!tendenz", "!tendenzen", "!2+", "!3-", "zwischennote", "halbe note"]
            },
            en: {
                q: "Do 2+ or 3- count differently?",
                a: "No. Plus and minus (tendencies) count as a whole grade: 2+ and 2- are both a 2.\nFor in-between grades like “2-3” special rules apply. The primary school can help.",
                w: ["!plus", "!minus", "!tendency", "!2+", "!3-", "in-between grade", "half grade"]
            },
            tr: {
                q: "2+ ya da 3- farklı mı sayılır?",
                a: "Hayır. Artı ve eksi (Tendenz) tam not olarak sayılır: 2+ ve 2- ikisi de 2'dir.\n„2-3“ gibi ara notlarda özel kurallar geçerlidir. Bu konuda ilkokul yardımcı olur.",
                w: ["!arti", "!eksi", "!tendenz", "!2+", "!3-", "ara not", "yarim not"]
            },
            ar: {
                q: "هل تُحسب 2+ أو 3- بشكل مختلف؟",
                a: "لا. علامة الزائد والناقص تُحسب كدرجة كاملة: 2+ و2- كلتاهما 2.\nللدرجات البينية مثل „2-3“ قواعد خاصة. المدرسة الابتدائية تساعدك في ذلك.",
                w: ["!زائد", "!ناقص", "!plus", "!minus", "!2+", "!3-", "درجة بينية"]
            },
            uk: {
                q: "Чи інакше рахуються 2+ або 3-?",
                a: "Ні. Плюс і мінус рахуються як ціла оцінка: 2+ і 2- – це обидва 2.\nДля проміжних оцінок на кшталт „2-3“ діють особливі правила. Тут допоможе початкова школа.",
                w: ["!плюс", "!мінус", "!2+", "!3-", "проміжн"]
            },
            ru: {
                q: "Считаются ли 2+ или 3- иначе?",
                a: "Нет. Плюс и минус считаются как целая оценка: 2+ и 2- – это обе 2.\nДля промежуточных оценок вроде „2-3“ действуют особые правила. Здесь поможет начальная школа.",
                w: ["!плюс", "!минус", "!2+", "!3-", "промежуточн"]
            }
        },
        {
            id: "sorge",
            links: ["info"],
            de: {
                q: "Und wenn es fürs Gymnasium nicht reicht?",
                a: "Kein Grund zur Sorge! 💛 ISS und Gemeinschaftsschule führen genauso zum Abitur, nur mit einem Jahr mehr Zeit. Viele Jugendliche blühen dort richtig auf.\nWer trotzdem ans Gymnasium möchte, kann den Probeunterricht machen. Am wichtigsten ist eine Schule, an der man sich wohlfühlt.",
                w: ["!schlecht", "!schlechte noten", "!sorge", "!sorgen", "!angst", "!traurig", "!enttauscht", "nicht geschafft", "reicht nicht", "nicht gut genug", "zu schlecht", "!durchgefallen", "!nicht bestanden", "was nun", "was jetzt"]
            },
            en: {
                q: "What if it's not enough for the Gymnasium?",
                a: "No need to worry! 💛 ISS and Gemeinschaftsschule lead to the Abitur just the same, with one more year of time. Many young people really thrive there.\nIf you still want the Gymnasium, there is the Probeunterricht. Most important is a school where you feel at home.",
                w: ["!bad grades", "!bad", "!worried", "!worry", "!afraid", "!scared", "!sad", "!disappointed", "not enough", "not good enough", "!failed", "what now"]
            },
            tr: {
                q: "Gymnasium için yetmezse ne olur?",
                a: "Endişeye gerek yok! 💛 ISS ve Gemeinschaftsschule de aynı şekilde Abitur'a götürür, sadece bir yıl daha fazla zamanla. Birçok genç orada gerçekten parlıyor.\nYine de Gymnasium istenirse Probeunterricht'e girilebilir. En önemlisi, kendini iyi hissettiğin bir okul.",
                w: ["!kotu", "!kotu not", "!notlar kotu", "!endise", "!korku", "!korkuyorum", "!uzgun", "!uzuldum", "yetmiyor", "yetmezse", "yetmedi", "olmazsa", "!kaldi", "!basaramadi", "ne olacak", "simdi ne"]
            },
            ar: {
                q: "ماذا لو لم يكفِ للـ Gymnasium؟",
                a: "لا داعي للقلق! 💛 الـ ISS والـ Gemeinschaftsschule تؤديان بالمثل إلى الـ Abitur، فقط مع سنة إضافية من الوقت. كثير من الشباب يتألقون هناك حقاً.\nومن يريد الـ Gymnasium رغم ذلك يمكنه دخول الـ Probeunterricht. الأهم مدرسة يشعر فيها الطفل بالراحة.",
                w: ["!سيئة", "!درجات سيئة", "!قلق", "!خائف", "!خوف", "!حزين", "لا يكفي", "لم ينجح", "رسب", "ماذا الان"]
            },
            uk: {
                q: "А якщо для Gymnasium не вистачає?",
                a: "Не хвилюйтеся! 💛 ISS і Gemeinschaftsschule так само ведуть до Abitur, просто з одним роком більше. Багато підлітків там по-справжньому розкриваються.\nЯкщо все ж хочеться до Gymnasium, можна пройти Probeunterricht. Найважливіше – школа, де дитині добре.",
                w: ["!погані", "!погано", "!хвилю", "!страшно", "!боюся", "!сумно", "не вистачає", "не вистачить", "не склав", "що тепер", "що робити"]
            },
            ru: {
                q: "А если для Gymnasium не хватает?",
                a: "Не волнуйтесь! 💛 ISS и Gemeinschaftsschule так же ведут к Abitur, просто с одним годом больше. Многие подростки там по-настоящему раскрываются.\nЕсли всё же хочется в Gymnasium, можно пройти Probeunterricht. Важнее всего – школа, где ребёнку хорошо.",
                w: ["!плохие", "!плохо", "!волну", "!страшно", "!боюсь", "!грустно", "не хватает", "не хватит", "не сдал", "что теперь", "что делать"]
            }
        },
        {
            id: "probe",
            faq: 3,
            links: ["dates"],
            extra: {
                de: "Termine 2027: Anmeldung am 8.–9. Februar, Probeunterricht am 19. Februar. 📅",
                en: "Dates 2027: registration on 8–9 February, Probeunterricht on 19 February. 📅",
                tr: "2027 tarihleri: kayıt 8–9 Şubat, Probeunterricht 19 Şubat. 📅",
                ar: "مواعيد 2027: التسجيل في 8–9 فبراير، والـ Probeunterricht في 19 فبراير. 📅",
                uk: "Дати 2027: запис 8–9 лютого, Probeunterricht 19 лютого. 📅",
                ru: "Даты 2027: запись 8–9 февраля, Probeunterricht 19 февраля. 📅"
            },
            de: { w: ["!probeunterricht", "!probe", "!aufnahmeprufung", "prufung", "test", "!probetag"] },
            en: { w: ["!probeunterricht", "!trial lessons", "!trial", "!entrance exam", "exam", "test"] },
            tr: { w: ["!probeunterricht", "!deneme dersi", "!deneme", "!sinav", "giris sinavi", "test"] },
            ar: { w: ["!probeunterricht", "!اختبار", "!امتحان", "!حصة تجريبية", "تجريبي"] },
            uk: { w: ["!probeunterricht", "!пробн", "!іспит", "!екзамен", "тест"] },
            ru: { w: ["!probeunterricht", "!пробн", "!экзамен", "!испытан", "тест"] }
        },
        {
            id: "schularten",
            links: ["info"],
            de: {
                q: "Welche Schularten gibt es?",
                a: "In Berlin gibt es drei Schularten:\n• Gymnasium – Abitur nach Klasse 12\n• Integrierte Sekundarschule (ISS) – Abitur nach Klasse 13\n• Gemeinschaftsschule – Abitur nach Klasse 13\nAlle sind gleich wertvoll und alle führen zum Abitur. Der Unterschied ist vor allem das Tempo. 🎓",
                w: ["!schularten", "!schulart", "!schulformen", "!besser", "!besseres", "!was ist besser", "!welche schulen", "unterschied", "oberschule", "weiterfuhrende schule", "~schule"]
            },
            en: {
                q: "Which school types are there?",
                a: "Berlin has three school types:\n• Gymnasium – Abitur after grade 12\n• Integrierte Sekundarschule (ISS) – Abitur after grade 13\n• Gemeinschaftsschule – Abitur after grade 13\nAll are equally valuable and all lead to the Abitur. The main difference is the pace. 🎓",
                w: ["!school types", "!school type", "!types of school", "!better", "!which is better", "!which schools", "difference", "secondary school", "oberschule", "~school"]
            },
            tr: {
                q: "Hangi okul türleri var?",
                a: "Berlin'de üç okul türü var:\n• Gymnasium – 12. sınıftan sonra Abitur\n• Integrierte Sekundarschule (ISS) – 13. sınıftan sonra Abitur\n• Gemeinschaftsschule – 13. sınıftan sonra Abitur\nHepsi eşit derecede değerlidir ve hepsi Abitur'a götürür. Fark çoğunlukla öğrenme hızındadır. 🎓",
                w: ["!okul turleri", "!okul turu", "!hangi okullar", "!daha iyi", "!hangisi iyi", "!hangisi daha", "!okul cesitleri", "fark", "farki", "ortaokul", "oberschule", "~okul"]
            },
            ar: {
                q: "ما أنواع المدارس الموجودة؟",
                a: "في برلين ثلاثة أنواع من المدارس:\n• Gymnasium – الـ Abitur بعد الصف 12\n• Integrierte Sekundarschule (ISS) – الـ Abitur بعد الصف 13\n• Gemeinschaftsschule – الـ Abitur بعد الصف 13\nكلها متساوية في القيمة وكلها تؤدي إلى الـ Abitur. الفرق الأساسي هو سرعة التعلم. 🎓",
                w: ["!انواع المدارس", "!نوع المدرسة", "!افضل من", "!ايهما افضل", "!اي مدارس", "الفرق", "المدرسة الثانوية", "oberschule", "~مدرسة"]
            },
            uk: {
                q: "Які є типи шкіл?",
                a: "У Берліні є три типи шкіл:\n• Gymnasium – Abitur після 12 класу\n• Integrierte Sekundarschule (ISS) – Abitur після 13 класу\n• Gemeinschaftsschule – Abitur після 13 класу\nУсі однаково цінні й усі ведуть до Abitur. Різниця переважно в темпі. 🎓",
                w: ["!типи шкіл", "!тип школи", "!краще", "!що краще", "!які школи", "різниця", "відмінн", "середня школа", "oberschule", "~школ"]
            },
            ru: {
                q: "Какие есть типы школ?",
                a: "В Берлине три типа школ:\n• Gymnasium – Abitur после 12 класса\n• Integrierte Sekundarschule (ISS) – Abitur после 13 класса\n• Gemeinschaftsschule – Abitur после 13 класса\nВсе одинаково ценны и все ведут к Abitur. Разница в основном в темпе. 🎓",
                w: ["!типы школ", "!тип школы", "!лучше", "!что лучше", "!какие школы", "разница", "отлич", "средняя школа", "oberschule", "~школ"]
            }
        },
        {
            id: "gymnasium",
            faq: 7,
            links: ["info"],
            de: { w: ["!was ist ein gymnasium", "!was ist das gymnasium", "gymnasium", "probejahr", "zweite fremdsprache", "klasse 12"] },
            en: { w: ["!what is a gymnasium", "!what is the gymnasium", "gymnasium", "trial year", "second foreign language", "grade 12"] },
            tr: { w: ["!gymnasium nedir", "!gymnasium ne", "gymnasium", "gimnazyum", "deneme yili", "ikinci yabanci dil", "12. sinif"] },
            ar: { w: ["!ما هو الـ gymnasium", "!ما هو gymnasium", "gymnasium", "جمنازيوم", "سنة تجريبية", "لغة اجنبية ثانية"] },
            uk: { w: ["!що таке gymnasium", "!що таке гімназія", "gymnasium", "гімназ", "пробний рік", "друга іноземна"] },
            ru: { w: ["!что такое gymnasium", "!что такое гимназия", "gymnasium", "гимназ", "пробный год", "второй иностранный"] }
        },
        {
            id: "iss",
            faq: 1,
            links: ["info"],
            de: { w: ["!iss", "!sekundarschule", "!integrierte sekundarschule", "!was ist eine iss", "oberstufe", "!msa", "!mittlerer schulabschluss", "!berufsbildungsreife", "!bbr", "abschluss", "abschlusse"] },
            en: { w: ["!iss", "!sekundarschule", "!integrierte sekundarschule", "!what is an iss", "upper school", "!msa", "!mittlerer schulabschluss", "!berufsbildungsreife", "qualification", "qualifications"] },
            tr: { w: ["!iss", "!sekundarschule", "!integrierte sekundarschule", "!iss nedir", "oberstufe", "!msa", "!mittlerer schulabschluss", "!berufsbildungsreife", "diploma", "mezuniyet"] },
            ar: { w: ["!iss", "!sekundarschule", "!integrierte sekundarschule", "!ما هي الـ iss", "!msa", "!mittlerer schulabschluss", "شهادة", "الشهادات"] },
            uk: { w: ["!iss", "!sekundarschule", "!integrierte sekundarschule", "!що таке iss", "!msa", "!mittlerer schulabschluss", "атестат", "випуск"] },
            ru: { w: ["!iss", "!sekundarschule", "!integrierte sekundarschule", "!что такое iss", "!msa", "!mittlerer schulabschluss", "аттестат", "выпуск"] }
        },
        {
            id: "gms",
            faq: 2,
            links: ["info"],
            de: { w: ["!gemeinschaftsschule", "!gms", "gemeinsam lernen"] },
            en: { w: ["!gemeinschaftsschule", "!gms", "community school"] },
            tr: { w: ["!gemeinschaftsschule", "!gms", "birlikte ogren"] },
            ar: { w: ["!gemeinschaftsschule", "!gms", "المدرسة المشتركة"] },
            uk: { w: ["!gemeinschaftsschule", "!gms", "спільн"] },
            ru: { w: ["!gemeinschaftsschule", "!gms", "общая школа"] }
        },
        {
            id: "abitur",
            faq: 5,
            links: ["info"],
            de: { w: ["!abitur", "!abi", "klasse 13", "studieren", "studium", "universitat"] },
            en: { w: ["!abitur", "!abi", "grade 13", "university", "study", "a-levels"] },
            tr: { w: ["!abitur", "!abi", "13. sinif", "universite", "okuyabilir"] },
            ar: { w: ["!abitur", "!الابيتور", "!البكالوريا", "الجامعة", "الصف 13"] },
            uk: { w: ["!abitur", "!абітур", "університет", "навчатися", "13 клас"] },
            ru: { w: ["!abitur", "!абитур", "университет", "учиться", "13 класс"] }
        },
        {
            id: "passt",
            faq: 4,
            links: ["tips"],
            de: { w: ["!welche schule passt", "!passt", "!richtige schule", "!beste schule", "aussuchen", "auswahlen", "entscheiden", "schulwahl", "tipps"] },
            en: { w: ["!which school suits", "!suits", "!right school", "!best school", "choose", "choosing", "decide", "tips"] },
            tr: { w: ["!hangi okul uygun", "!uygun okul", "!dogru okul", "!en iyi okul", "hangi okulu", "secmek", "secim", "karar", "ipucu", "tavsiye"] },
            ar: { w: ["!اي مدرسة تناسب", "!المدرسة المناسبة", "!افضل مدرسة", "اختيار", "اختار", "قرار", "نصائح"] },
            uk: { w: ["!яка школа підходить", "!яку школу", "!найкраща школа", "обрати", "вибрати", "вибір школи", "поради"] },
            ru: { w: ["!какая школа подходит", "!какую школу", "!лучшая школа", "выбрать", "выбор школы", "советы"] }
        },
        {
            id: "anmeldung",
            links: ["dates"],
            de: {
                q: "Wann und wo melde ich an?",
                a: "Die Anmeldung an der Oberschule ist vom 3. bis 11. März 2027, direkt an der Schule Ihres Erstwunsches.\nDen Anmeldebogen mit Erst-, Zweit- und Drittwunsch gibt es von der Grundschule. Den Bescheid über den Schulplatz gibt es meist im Juni. 📬",
                w: ["!anmeldung", "!anmelden", "!anmeldezeitraum", "!anmeldebogen", "!erstwunsch", "zweitwunsch", "drittwunsch", "bescheid", "!wo melde", "unterlagen", "marz", "frist", "~wann"]
            },
            en: {
                q: "When and where do I register?",
                a: "Registration at the secondary school is from 3 to 11 March 2027, directly at your first-choice school.\nYou get the registration form with 1st, 2nd and 3rd choice from the primary school. The letter (Bescheid) about the school place usually comes in June. 📬",
                w: ["!registration", "!register", "!apply", "!application", "!enrol", "!first choice", "second choice", "third choice", "bescheid", "documents", "march", "deadline", "~when"]
            },
            tr: {
                q: "Kayıt ne zaman ve nerede?",
                a: "Ortaokula kayıt 3–11 Mart 2027 tarihleri arasındadır, doğrudan 1. tercihiniz olan okulda yapılır.\n1., 2. ve 3. tercihli kayıt formunu ilkokuldan alırsınız. Okul yeriyle ilgili karar (Bescheid) genellikle Haziran'da gelir. 📬",
                w: ["!kayit", "!kaydol", "!basvuru", "!basvur", "!anmeldung", "!birinci tercih", "!1. tercih", "ikinci tercih", "tercih", "bescheid", "evrak", "mart", "son gun", "~ne zaman"]
            },
            ar: {
                q: "متى وأين أسجّل؟",
                a: "التسجيل في المدرسة الثانوية من 3 إلى 11 مارس 2027، مباشرة في المدرسة التي هي رغبتك الأولى.\nتحصل على استمارة التسجيل بالرغبة الأولى والثانية والثالثة من المدرسة الابتدائية. يصل قرار المقعد المدرسي (Bescheid) غالباً في يونيو. 📬",
                w: ["!التسجيل", "!تسجيل", "!اسجل", "!التقديم", "!anmeldung", "!الرغبة الاولى", "الرغبة الثانية", "رغبة", "bescheid", "اوراق", "مارس", "اخر موعد", "~متى"]
            },
            uk: {
                q: "Коли і де подавати заяву?",
                a: "Подання заяви до середньої школи – з 3 до 11 березня 2027 року, прямо в школі вашого першого вибору.\nФорму заяви з 1-м, 2-м і 3-м вибором дає початкова школа. Рішення (Bescheid) про місце в школі зазвичай надходить у червні. 📬",
                w: ["!заяв", "!записатися", "!запис", "!реєстрац", "!anmeldung", "!перший вибір", "другий вибір", "bescheid", "документ", "березн", "термін", "~коли"]
            },
            ru: {
                q: "Когда и где подавать заявление?",
                a: "Подача заявления в среднюю школу – с 3 по 11 марта 2027 года, прямо в школе вашего первого выбора.\nФорму заявления с 1-м, 2-м и 3-м выбором выдаёт начальная школа. Решение (Bescheid) о месте в школе обычно приходит в июне. 📬",
                w: ["!заявлен", "!записаться", "!запись", "!регистрац", "!anmeldung", "!первый выбор", "второй выбор", "bescheid", "документ", "март", "срок", "~когда"]
            }
        },
        {
            id: "termine",
            links: ["dates"],
            de: {
                q: "Welche Termine sind wichtig?",
                a: "Die wichtigsten Termine für 2027:\n• Nov.–Jan.: Tage der offenen Tür\n• Ende Januar: Zeugnis 6/1 und Förderprognose\n• 8.–9. Februar: Anmeldung zum Probeunterricht\n• 19. Februar: Probeunterricht\n• 3.–11. März: Anmeldung an der Oberschule\n• meist Juni: Bescheid über den Schulplatz\nBitte prüfen Sie die Termine auf der offiziellen Seite. 📅",
                w: ["!termine", "!termin", "!datum", "!fristen", "!zeitplan", "!kalender", "wann", "zeitraum", "deadline"]
            },
            en: {
                q: "Which dates are important?",
                a: "The most important dates for 2027:\n• Nov–Jan: open days\n• end of January: report 6/1 and Förderprognose\n• 8–9 February: registration for the Probeunterricht\n• 19 February: Probeunterricht\n• 3–11 March: registration at the secondary school\n• usually June: letter about the school place\nPlease check the dates on the official page. 📅",
                w: ["!dates", "!date", "!deadlines", "!deadline", "!schedule", "!calendar", "!timeline", "when"]
            },
            tr: {
                q: "Önemli tarihler neler?",
                a: "2027 için en önemli tarihler:\n• Kasım–Ocak: açık kapı günleri\n• Ocak sonu: 6/1 karnesi ve Förderprognose\n• 8–9 Şubat: Probeunterricht'e kayıt\n• 19 Şubat: Probeunterricht\n• 3–11 Mart: ortaokula kayıt\n• genellikle Haziran: okul yeri kararı\nLütfen tarihleri resmî sayfadan kontrol edin. 📅",
                w: ["!tarihler", "!tarih", "!takvim", "!son tarih", "ne zaman", "!hangi tarih"]
            },
            ar: {
                q: "ما المواعيد المهمة؟",
                a: "أهم المواعيد لعام 2027:\n• نوفمبر–يناير: أيام الأبواب المفتوحة\n• نهاية يناير: شهادة 6/1 والـ Förderprognose\n• 8–9 فبراير: التسجيل في الـ Probeunterricht\n• 19 فبراير: الـ Probeunterricht\n• 3–11 مارس: التسجيل في المدرسة الثانوية\n• غالباً يونيو: قرار المقعد المدرسي\nيرجى التحقق من المواعيد في الصفحة الرسمية. 📅",
                w: ["!المواعيد", "!موعد", "!تاريخ", "!التواريخ", "!الجدول", "متى", "اخر موعد"]
            },
            uk: {
                q: "Які дати важливі?",
                a: "Найважливіші дати на 2027 рік:\n• листопад–січень: дні відкритих дверей\n• кінець січня: табель 6/1 і Förderprognose\n• 8–9 лютого: запис на Probeunterricht\n• 19 лютого: Probeunterricht\n• 3–11 березня: подання заяви до середньої школи\n• зазвичай червень: рішення про місце в школі\nБудь ласка, перевірте дати на офіційній сторінці. 📅",
                w: ["!дати", "!дата", "!терміни", "!календар", "!розклад", "коли"]
            },
            ru: {
                q: "Какие даты важны?",
                a: "Самые важные даты на 2027 год:\n• ноябрь–январь: дни открытых дверей\n• конец января: табель 6/1 и Förderprognose\n• 8–9 февраля: запись на Probeunterricht\n• 19 февраля: Probeunterricht\n• 3–11 марта: подача заявления в среднюю школу\n• обычно июнь: решение о месте в школе\nПожалуйста, проверьте даты на официальной странице. 📅",
                w: ["!даты", "!дата", "!сроки", "!календарь", "!расписание", "когда"]
            }
        },
        {
            id: "offenetuer",
            links: ["find", "tips"],
            de: {
                q: "Wann ist der Tag der offenen Tür?",
                a: "Die meisten Oberschulen laden zwischen November und Januar ein. Die Termine stehen auf der Webseite der Schule.\nViele Termine finden Sie auch hier: Schulen finden → „Details“. Tipp: Nehmen Sie die 5 Fragen aus „Tipps & Termine“ mit. 🏫",
                w: ["!tag der offenen tur", "!offene tur", "!offenen tur", "!infoabend", "!infotag", "!schule besuchen", "besichtigen", "kennenlernen"]
            },
            en: {
                q: "When is the open day?",
                a: "Most secondary schools invite families between November and January. The dates are on the school's website.\nYou'll also find many dates here: Find schools → “Details”. Tip: take the 5 questions from “Tips & dates” with you. 🏫",
                w: ["!open day", "!open house", "!tag der offenen tur", "!information evening", "!info evening", "!visit the school", "visit", "get to know"]
            },
            tr: {
                q: "Açık kapı günü ne zaman?",
                a: "Çoğu ortaokul Kasım ile Ocak arasında davet eder. Tarihler okulun internet sitesinde yer alır.\nBirçok tarihi burada da bulabilirsiniz: Okul bul → „Ayrıntılar“. İpucu: „İpuçları ve tarihler“ bölümündeki 5 soruyu yanınıza alın. 🏫",
                w: ["!acik kapi", "!acik gun", "!tag der offenen tur", "!bilgilendirme aksami", "!okulu gezmek", "!okulu ziyaret", "ziyaret", "gezmek", "tanimak"]
            },
            ar: {
                q: "متى يوم الأبواب المفتوحة؟",
                a: "تدعو معظم المدارس الثانوية بين نوفمبر ويناير. المواعيد موجودة على موقع المدرسة.\nتجد كثيراً من المواعيد هنا أيضاً: البحث عن مدارس ← „التفاصيل“. نصيحة: خذ معك الأسئلة الخمسة من „نصائح ومواعيد“. 🏫",
                w: ["!الابواب المفتوحة", "!يوم مفتوح", "!tag der offenen tur", "!امسية معلومات", "!زيارة المدرسة", "زيارة", "التعرف"]
            },
            uk: {
                q: "Коли день відкритих дверей?",
                a: "Більшість середніх шкіл запрошують з листопада до січня. Дати є на сайті школи.\nБагато дат є і тут: Знайти школи → „Деталі“. Порада: візьміть із собою 5 питань із розділу „Поради й дати“. 🏫",
                w: ["!відкритих дверей", "!день відкритих", "!tag der offenen tur", "!інформаційний вечір", "!відвідати школу", "відвідати", "познайомитися"]
            },
            ru: {
                q: "Когда день открытых дверей?",
                a: "Большинство средних школ приглашают с ноября по январь. Даты есть на сайте школы.\nМного дат есть и здесь: Найти школы → „Подробнее“. Совет: возьмите с собой 5 вопросов из раздела „Советы и даты“. 🏫",
                w: ["!открытых дверей", "!день открытых", "!tag der offenen tur", "!информационный вечер", "!посетить школу", "посетить", "познакомиться"]
            }
        },
        {
            id: "app",
            links: ["calc"],
            de: {
                q: "Wie funktioniert diese Seite?",
                a: "In 4 Schritten:\n1. Noten aus dem Zeugnis eintragen und berechnen\n2. Mit der Postleitzahl Schulen in der Nähe finden\n3. Schulen merken und vergleichen\n4. Tipps und Termine lesen\nAlles ist kostenlos und bleibt auf Ihrem Gerät. ✨",
                w: ["!wie funktioniert", "!anleitung", "!bedienung", "!wie benutze", "!wie nutze", "!was kann", "!diese seite", "!die app", "!was macht", "erklarung", "schritte", "eintragen"]
            },
            en: {
                q: "How does this page work?",
                a: "In 4 steps:\n1. Enter the grades from the report and calculate\n2. Find schools nearby with your postcode\n3. Save and compare schools\n4. Read tips and dates\nEverything is free and stays on your device. ✨",
                w: ["!how does it work", "!how does this work", "!how to use", "!instructions", "!what can", "!this page", "!the app", "!this site", "steps", "enter grades"]
            },
            tr: {
                q: "Bu sayfa nasıl çalışır?",
                a: "4 adımda:\n1. Karnedeki notları girin ve hesaplayın\n2. Posta koduyla yakındaki okulları bulun\n3. Okulları kaydedin ve karşılaştırın\n4. İpuçlarını ve tarihleri okuyun\nHer şey ücretsizdir ve cihazınızda kalır. ✨",
                w: ["!nasil calisir", "!nasil kullan", "!kullanim", "!ne ise yariyor", "!bu sayfa", "!bu site", "!uygulama", "!app", "adim", "not gir"]
            },
            ar: {
                q: "كيف تعمل هذه الصفحة؟",
                a: "في 4 خطوات:\n1. أدخل الدرجات من الشهادة واحسب\n2. ابحث عن مدارس قريبة بالرمز البريدي\n3. احفظ المدارس وقارن بينها\n4. اقرأ النصائح والمواعيد\nكل شيء مجاني ويبقى على جهازك. ✨",
                w: ["!كيف تعمل", "!كيف استخدم", "!طريقة الاستخدام", "!هذه الصفحة", "!التطبيق", "!الموقع", "خطوات", "ادخال الدرجات"]
            },
            uk: {
                q: "Як працює ця сторінка?",
                a: "У 4 кроки:\n1. Введіть оцінки з табеля й розрахуйте\n2. Знайдіть школи поруч за поштовим індексом\n3. Збережіть і порівняйте школи\n4. Прочитайте поради й дати\nУсе безкоштовно й залишається на вашому пристрої. ✨",
                w: ["!як працює", "!як користуватися", "!інструкц", "!ця сторінка", "!цей сайт", "!застосунок", "кроки", "ввести оцінки"]
            },
            ru: {
                q: "Как работает эта страница?",
                a: "В 4 шага:\n1. Введите оценки из табеля и рассчитайте\n2. Найдите школы рядом по почтовому индексу\n3. Сохраните и сравните школы\n4. Прочитайте советы и даты\nВсё бесплатно и остаётся на вашем устройстве. ✨",
                w: ["!как работает", "!как пользоваться", "!инструкц", "!эта страница", "!этот сайт", "!приложение", "шаги", "ввести оценки"]
            }
        },
        {
            id: "schulsuche",
            links: ["find", "mine"],
            de: {
                q: "Wie finde ich Schulen in der Nähe?",
                a: "Geben Sie unter „Schulen finden“ Ihre Postleitzahl ein und wählen Sie den Umkreis. Sie sehen eine Liste mit Entfernung, auf Wunsch auch eine Karte. 🗺️\nMit „Merken“ landen Schulen in „Meine Auswahl“. Dort können Sie sie nebeneinander vergleichen.",
                w: ["!schulen finden", "!schule finden", "!in der nahe", "!nahe", "!postleitzahl", "!plz", "!umkreis", "!karte", "suchen", "suche", "merken", "vergleichen", "merkliste", "meine auswahl", "~wo"]
            },
            en: {
                q: "How do I find schools nearby?",
                a: "Under “Find schools”, enter your postcode and choose the radius. You'll see a list with distances and, if you like, a map. 🗺️\nWith “Save”, schools go to “My selection”, where you can compare them side by side.",
                w: ["!find schools", "!find a school", "!nearby", "!near me", "!postcode", "!zip", "!radius", "!map", "search", "save", "compare", "my selection", "~where"]
            },
            tr: {
                q: "Yakındaki okulları nasıl bulurum?",
                a: "„Okul bul“ bölümünde posta kodunuzu girin ve mesafeyi seçin. Mesafeli bir liste, isterseniz bir de harita görürsünüz. 🗺️\n„Kaydet“ ile okullar „Seçtiklerim“ bölümüne eklenir. Orada onları yan yana karşılaştırabilirsiniz.",
                w: ["!okul bul", "!okul ara", "!yakin", "!yakindaki", "!posta kodu", "!plz", "!harita", "ara", "arama", "kaydet", "karsilastir", "sectiklerim", "~nerede"]
            },
            ar: {
                q: "كيف أجد مدارس قريبة؟",
                a: "في „البحث عن مدارس“ أدخل الرمز البريدي واختر المسافة. ترى قائمة بالمسافات، وإن شئت خريطة أيضاً. 🗺️\nبزر „حفظ“ تنتقل المدارس إلى „اختياراتي“، وهناك يمكنك المقارنة بينها.",
                w: ["!البحث عن مدارس", "!ابحث عن مدرسة", "!قريبة", "!قريب", "!الرمز البريدي", "!خريطة", "بحث", "حفظ", "مقارنة", "اختياراتي", "~اين"]
            },
            uk: {
                q: "Як знайти школи поруч?",
                a: "У розділі „Знайти школи“ введіть поштовий індекс і оберіть радіус. Ви побачите список із відстанню, а за бажанням і карту. 🗺️\nКнопкою „Зберегти“ школи потрапляють у „Мій вибір“, де їх можна порівняти.",
                w: ["!знайти школ", "!пошук школ", "!поруч", "!поблизу", "!поштовий індекс", "!індекс", "!карта", "пошук", "зберегти", "порівняти", "мій вибір", "~де"]
            },
            ru: {
                q: "Как найти школы рядом?",
                a: "В разделе „Найти школы“ введите почтовый индекс и выберите радиус. Вы увидите список с расстоянием, а при желании и карту. 🗺️\nКнопкой „Сохранить“ школы попадают в „Мой выбор“, где их можно сравнить.",
                w: ["!найти школ", "!поиск школ", "!рядом", "!поблизости", "!почтовый индекс", "!индекс", "!карта", "поиск", "сохранить", "сравнить", "мой выбор", "~где"]
            }
        },
        {
            id: "datenschutz",
            links: ["privacy"],
            de: {
                q: "Was passiert mit meinen Daten?",
                a: "Ihre Eingaben bleiben auf Ihrem Gerät. 🔒 Noten, Postleitzahl und Ihre Fragen hier werden nur in Ihrem Browser verarbeitet und nicht gesendet.\nKeine Cookies, kein Tracking, keine Werbung. Gemerkte Schulen und Notizen bleiben nur in Ihrem Browser. Nur wenn Sie die Karte öffnen, lädt Ihr Browser Kartenbilder von OpenStreetMap (dabei wird Ihre IP-Adresse übertragen).",
                w: ["!datenschutz", "!daten", "!privat", "!sicher", "!cookies", "!tracking", "!gespeichert", "!speichern", "!dsgvo", "gesendet", "werbung", "anonym"]
            },
            en: {
                q: "What happens to my data?",
                a: "Your entries stay on your device. 🔒 Grades, postcode and your questions here are only processed in your browser and never sent.\nNo cookies, no tracking, no ads. Saved schools and notes stay only in your browser. Only if you open the map does your browser load map images from OpenStreetMap (this sends your IP address).",
                w: ["!privacy", "!data", "!private", "!safe", "!secure", "!cookies", "!tracking", "!stored", "!gdpr", "sent", "ads", "anonymous"]
            },
            tr: {
                q: "Verilerime ne oluyor?",
                a: "Girdiğiniz bilgiler cihazınızda kalır. 🔒 Notlar, posta kodu ve buradaki sorularınız yalnızca tarayıcınızda işlenir ve gönderilmez.\nÇerez yok, takip yok, reklam yok. Kaydettiğiniz okullar ve notlar yalnızca tarayıcınızda kalır. Yalnızca haritayı açarsanız tarayıcınız OpenStreetMap'ten harita görüntüleri yükler (bu sırada IP adresiniz iletilir).",
                w: ["!veri", "!veriler", "!verilerim", "!gizlilik", "!datenschutz", "!guvenli", "!cerez", "!takip", "!kaydediliyor", "!saklaniyor", "gonderiliyor", "reklam", "kvkk"]
            },
            ar: {
                q: "ماذا يحدث لبياناتي؟",
                a: "تبقى بياناتك على جهازك. 🔒 الدرجات والرمز البريدي وأسئلتك هنا تُعالج فقط في متصفحك ولا تُرسل.\nلا ملفات تعريف ارتباط، لا تتبع، لا إعلانات. المدارس المحفوظة والملاحظات تبقى في متصفحك فقط. فقط إذا فتحتم الخريطة يحمّل متصفحكم صور الخريطة من OpenStreetMap (ويُرسل عنوان IP الخاص بكم).",
                w: ["!البيانات", "!بياناتي", "!الخصوصية", "!حماية البيانات", "!datenschutz", "!امن", "!كوكيز", "!تتبع", "!تخزين", "ارسال", "اعلانات"]
            },
            uk: {
                q: "Що відбувається з моїми даними?",
                a: "Ваші дані залишаються на вашому пристрої. 🔒 Оцінки, індекс і ваші питання тут обробляються лише у вашому браузері й не надсилаються.\nБез cookies, без стеження, без реклами. Збережені школи й нотатки залишаються лише у вашому браузері. Лише якщо ви відкриєте карту, браузер завантажить зображення карти з OpenStreetMap (при цьому передається ваша IP-адреса).",
                w: ["!дані", "!даними", "!конфіденційн", "!захист даних", "!datenschutz", "!безпечн", "!cookies", "!стеження", "!зберігає", "надсила", "реклам"]
            },
            ru: {
                q: "Что происходит с моими данными?",
                a: "Ваши данные остаются на вашем устройстве. 🔒 Оценки, индекс и ваши вопросы здесь обрабатываются только в вашем браузере и не отправляются.\nБез cookies, без слежки, без рекламы. Сохранённые школы и заметки остаются только в вашем браузере. Только если вы откроете карту, браузер загрузит изображения карты с OpenStreetMap (при этом передаётся ваш IP-адрес).",
                w: ["!данные", "!данными", "!конфиденциальн", "!защита данных", "!datenschutz", "!безопасн", "!cookies", "!слежк", "!сохраняет", "отправля", "реклам"]
            }
        },
        {
            id: "kosten",
            links: ["official", "imprint"],
            de: {
                q: "Ist die Seite kostenlos und offiziell?",
                a: "Die Seite ist komplett kostenlos und ohne Anmeldung. 💙 Sie ist ein privates Hilfsangebot, keine offizielle Seite des Landes Berlin.\nAlle Angaben ohne Gewähr. Verbindlich sind die Grundschule und die Senatsverwaltung für Bildung.",
                w: ["!kostenlos", "!kosten", "!kostet", "!gratis", "!umsonst", "!offiziell", "!wer steckt", "!wer hat", "!impressum", "!kontakt", "!e-mail", "seriös", "senat"]
            },
            en: {
                q: "Is this page free and official?",
                a: "The page is completely free and needs no sign-up. 💙 It is a private help offer, not an official page of the State of Berlin.\nAll information without guarantee. The primary school and the Senate Department for Education have the final word.",
                w: ["!free", "!cost", "!costs", "!price", "!official", "!who made", "!who is behind", "!contact", "!email", "!imprint", "legit", "senate"]
            },
            tr: {
                q: "Sayfa ücretsiz ve resmî mi?",
                a: "Sayfa tamamen ücretsizdir ve kayıt gerektirmez. 💙 Özel bir yardım sayfasıdır, Berlin eyaletinin resmî sayfası değildir.\nBilgiler garanti verilmeden sunulur. Bağlayıcı olan ilkokul ve Eğitim Senatosu'dur (Senatsverwaltung für Bildung).",
                w: ["!ucretsiz", "!ucret", "!para", "!bedava", "!resmi", "!kim yapti", "!kimin", "!iletisim", "!e-posta", "!mail", "!impressum", "guvenilir", "senato"]
            },
            ar: {
                q: "هل الصفحة مجانية ورسمية؟",
                a: "الصفحة مجانية بالكامل ولا تحتاج تسجيلاً. 💙 هي مساعدة خاصة، وليست صفحة رسمية لولاية برلين.\nجميع المعلومات بدون ضمان. القرار الملزم للمدرسة الابتدائية ولإدارة التعليم في مجلس الشيوخ.",
                w: ["!مجاني", "!مجانا", "!تكلفة", "!السعر", "!رسمي", "!رسمية", "!من صنع", "!تواصل", "!بريد", "!impressum"]
            },
            uk: {
                q: "Сторінка безкоштовна й офіційна?",
                a: "Сторінка повністю безкоштовна й без реєстрації. 💙 Це приватна допомога, а не офіційна сторінка землі Берлін.\nУся інформація без гарантії. Остаточне слово за початковою школою та Сенатським управлінням освіти.",
                w: ["!безкоштовн", "!коштує", "!ціна", "!офіційн", "!хто зробив", "!хто стоїть", "!контакт", "!пошта", "!impressum"]
            },
            ru: {
                q: "Страница бесплатная и официальная?",
                a: "Страница полностью бесплатная и без регистрации. 💙 Это частная помощь, а не официальная страница земли Берлин.\nВся информация без гарантии. Окончательное слово за начальной школой и Сенатским управлением образования.",
                w: ["!бесплатн", "!стоит", "!цена", "!официальн", "!кто сделал", "!кто стоит", "!контакт", "!почта", "!impressum"]
            }
        },
        {
            id: "sonderfall",
            faq: 6,
            links: ["official"],
            de: { w: ["!fehlt", "!fehlende note", "!anderes bundesland", "!ausland", "!2-3", "!sonderfall", "neu in berlin", "zugezogen", "keine note"] },
            en: { w: ["!missing", "!missing grade", "!another state", "!abroad", "!2-3", "!special case", "new to berlin", "moved", "no grade"] },
            tr: { w: ["!eksik", "!eksik not", "!baska eyalet", "!yurt disi", "!2-3", "!ozel durum", "berlin'e yeni", "tasindik", "not yok"] },
            ar: { w: ["!ناقصة", "!درجة ناقصة", "!ولاية اخرى", "!من الخارج", "!2-3", "!حالة خاصة", "جديد في برلين", "انتقلنا"] },
            uk: { w: ["!бракує", "!немає оцінки", "!інша земля", "!з-за кордону", "!2-3", "!особливий випадок", "переїхали"] },
            ru: { w: ["!не хватает оценки", "!нет оценки", "!другая земля", "!из-за границы", "!2-3", "!особый случай", "переехали"] }
        },
        {
            id: "ganztag",
            faq: 8,
            links: ["find"],
            de: { w: ["!ganztag", "!ganztags", "!nachmittag", "!mittagessen", "!hort", "betreuung"] },
            en: { w: ["!ganztag", "!all-day", "!all day", "!afternoon", "!lunch", "care"] },
            tr: { w: ["!ganztag", "!tam gun", "!tam gunluk", "!ogleden sonra", "!ogle yemegi", "bakim"] },
            ar: { w: ["!ganztag", "!دوام كامل", "!بعد الظهر", "!الغداء", "رعاية"] },
            uk: { w: ["!ganztag", "!повний день", "!після обіду", "!обід", "продовжен"] },
            ru: { w: ["!ganztag", "!полный день", "!после обеда", "!обед", "продлён"] }
        },
        {
            id: "profil",
            faq: 9,
            links: ["find"],
            de: { w: ["!profil", "!bilingual", "!europa-schule", "!europaschule", "!mint", "schwerpunkt", "musikbetont", "sportbetont", "sprachen"] },
            en: { w: ["!profil", "!profile", "!bilingual", "!europa-schule", "!europe school", "!mint", "focus", "languages"] },
            tr: { w: ["!profil", "!bilingual", "!iki dilli", "!europa-schule", "!avrupa okulu", "!mint", "agirlik", "diller"] },
            ar: { w: ["!profil", "!ثنائي اللغة", "!bilingual", "!europa-schule", "!مدرسة اوروبية", "!mint", "تخصص", "لغات"] },
            uk: { w: ["!profil", "!профіль", "!двомовн", "!bilingual", "!europa-schule", "!mint", "мови"] },
            ru: { w: ["!profil", "!профиль", "!двуязычн", "!bilingual", "!europa-schule", "!mint", "языки"] }
        }
    ];

    // Themen, die am Anfang als Knöpfe erscheinen
    var START = ["durchschnitt", "eignung", "anmeldung", "offenetuer", "schularten", "datenschutz"];

    var api = { UI: UI, SMALLTALK: SMALLTALK, THEMEN: THEMEN, START: START };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    } else {
        root.AssistentDaten = api;
    }
})(this);
