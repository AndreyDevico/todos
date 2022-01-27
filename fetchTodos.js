const BASE_URL = 'http://localhost:8000';


// 1. Обработка query string
// 2. JSON.stringify для body тут
// 3. Тут должны быть дефолтные хедеры
export const callAPI = async (endpoint, options) => {
  try {
    const data = await fetch(`${BASE_URL}${endpoint}`, options);
    if (data.ok) {
      return await data.json();
    }
  } catch (error) {
    // error должен возвращать message, а не весь объект error ???
    throw error;
  }
};
