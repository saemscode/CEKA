import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const main = async () => {
  const keys = [
    process.env.DEEPSEEK_API_KEY,
    process.env.DEEPSEEK_API_KEY_SECONDARY,
    "sk-7a56eb30338d40d4a116f97be6f66514"
  ].filter(k => !!k);

  for (const key of keys) {
    const cleanKey = key.replace(/"/g, '').replace(/'/g, '').trim();
    console.log(`Checking Key: ${cleanKey.slice(0, 8)}...`);
    try {
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'hi' }]
        },
        {
          headers: { Authorization: `Bearer ${cleanKey}` },
          timeout: 10000
        }
      );
      console.log(`  RESULT: OK`);
    } catch (err: any) {
      const status = err.response?.status;
      const errorMsg = err.response?.data?.error?.message || err.message;
      console.log(`  RESULT: ERROR [Status ${status}]: ${errorMsg}`);
    }
  }
};

main();
