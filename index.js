
const TelegramBot = require('node-telegram-bot-api');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs } = require('firebase/firestore');

// Ініціалізація Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDA82MobCXePwwz_mct9vNV4U1JFNTOrEI",
  authDomain: "time-tracking-e2815.firebaseapp.com",
  projectId: "time-tracking-e2815",
  storageBucket: "time-tracking-e2815.appspot.com",
  messagingSenderId: "432969876974",
  appId: "1:432969876974:web:ee4fdb4cb9b39ea8763aff"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const token = '6529281070:AAGm6QRn7FZni4kaKMbA4Hmn26Adk4vObgI';

const bot = new TelegramBot(token, { polling: true });

const mainMenu = {
  reply_markup: {
    keyboard: [['Добавить категорию'], ['Все дати'], ['Отправить фото']],
    // one_time_keyboard: true
  }
};


bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === '/start' || msg.text === 'Добавить категорию' || msg.text === 'Все дати' || msg.text === 'Отправить фото') {

    handleSpecialMessages(msg);
  }
});

async function handleSpecialMessages(msg) {
  const chatId = msg.chat.id;

  
  if (msg.text === '/start') {
    bot.sendMessage(chatId, 'Виберите действие:', mainMenu);
  } else if (msg.text === 'Добавить категорию') {
    bot.sendMessage(chatId, `Пожалуйста, введите название категории:`, {
      reply_markup: {
        force_reply: true
      }
    });

    bot.once('message', async (msg) => {
      if (msg.reply_to_message && msg.reply_to_message.text === "Пожалуйста, введите название категории:") {
        const category = msg.text;
        const currentDate = new Date().toLocaleDateString();

        try {
          const docRef = await addDoc(collection(db, 'categoryBase'), {
            createdAt: currentDate,
            text: category,
            timeElapsed: 0
          });
          bot.sendMessage(chatId, `Категория успешно добавлена до бази данних!`, mainMenu);
          console.log("docRef", docRef)
        } catch (error) {
          console.error("Ошибка при добавлении категории:", error);
          bot.sendMessage(chatId, `Ошибка при добавлении категории.`, mainMenu);
        }
      }
    });
  } else if (msg.text === 'Все дати') {
    try {
      const q = query(collection(db, 'categoryBase'));
      const querySnapshot = await getDocs(q);
      const uniqueDates = new Set();

      querySnapshot.forEach((doc) => {
        const categoryData = doc.data();
        uniqueDates.add(categoryData.createdAt);
      });

      const datesKeyboard = {
        reply_markup: {
          keyboard: Array.from(uniqueDates).map(date => [{ text: date }]),
          one_time_keyboard: true
        }
      };

      bot.sendMessage(chatId, 'Оберіть дату:', datesKeyboard);
      bot.once('message', async (msg) => {
        const selectedDate = msg.text;

        try {
          const q = query(collection(db, 'categoryBase'), where('createdAt', '==', selectedDate));
          const querySnapshot = await getDocs(q);
          let categories = '';

          querySnapshot.forEach((doc) => {
            const categoryData = doc.data();
            categories += categoryData.text + categoryData.timeElapsed + '\n';
          });

          bot.sendMessage(chatId, `Категории за ${selectedDate}:\n${categories}`, mainMenu);
        } catch (error) {
          console.error("Ошибка при получении категорий по дате:", error);
          bot.sendMessage(chatId, `Ошибка при получении категорий по дате.`, mainMenu);
        }
      });
    } catch (error) {
      console.error("Ошибка при получении дат:", error);
      bot.sendMessage(chatId, `Ошибка при получении дат.`, mainMenu);
    }
  } else if (msg.text === 'Отправить фото') {
    bot.sendMessage(chatId, `Пожалуйста, отправьте фотографию:`, {
      reply_markup: {
        force_reply: true
      }
    });

    bot.once('photo', async (msg) => {
      if (msg.reply_to_message && msg.reply_to_message.text === "Пожалуйста, отправьте фотографию:") {
        const photoId = msg.photo[0].file_id;
        const photo = await bot.getFile(photoId);

        const userId = msg.from.id.toString();
        uploadUserPhoto(userId, photo);

        bot.sendMessage(chatId, 'Фотография успешно получена и сохранена!', mainMenu);

        async function uploadUserPhoto(userId, photo) {
          try {
            await addDoc(collection(db, 'fotoUser'), {
              userId: userId,
              photoUrl: photo
            });
            console.log('Фото успешно загружено в Firestore.');
          } catch (error) {
            console.error('Ошибка при загрузке фото в Firestore:', error);
          }
        }
      }
    });
  }
}

console.log('Telegram bot has been started...');