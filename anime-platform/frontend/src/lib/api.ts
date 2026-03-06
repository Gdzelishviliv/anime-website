import axios, { AxiosInstance } from 'axios';

// Each microservice runs on its own port (no gateway)
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';
const USER_URL = process.env.NEXT_PUBLIC_USER_URL || 'http://localhost:3002';
const ANIME_URL = process.env.NEXT_PUBLIC_ANIME_URL || 'http://localhost:3003';
const STREAMING_URL = process.env.NEXT_PUBLIC_STREAMING_URL || 'http://localhost:3004';
const SUBSCRIPTION_URL = process.env.NEXT_PUBLIC_SUBSCRIPTION_URL || 'http://localhost:3005';

const createClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  });
  attachInterceptors(client);
  return client;
};

function attachInterceptors(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');

          const { data } = await axios.post(`${AUTH_URL}/auth/refresh`, {
            refreshToken,
          });

          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return client(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }

      return Promise.reject(error);
    },
  );
}

const authClient = createClient(AUTH_URL);
const userClient = createClient(USER_URL);
const animeClient = createClient(ANIME_URL);
const streamingClient = createClient(STREAMING_URL);
const subscriptionClient = createClient(SUBSCRIPTION_URL);

// Keep a default export for backwards compat
const api = authClient;

// ---- Auth API ----
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    authClient.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    authClient.post('/auth/login', data),
  logout: (refreshToken?: string) =>
    authClient.post('/auth/logout', { refreshToken }),
  getMe: () => authClient.get('/auth/me'),
  refresh: (refreshToken: string) =>
    authClient.post('/auth/refresh', { refreshToken }),
};

// ---- Anime API ----
export const animeApi = {
  getTrending: (page = 1, limit = 25) =>
    animeClient.get(`/anime/trending?page=${page}&limit=${limit}`),
  getTop: (page = 1, limit = 25) =>
    animeClient.get(`/anime/top?page=${page}&limit=${limit}`),
  getById: (id: number) => animeClient.get(`/anime/${id}`),
  getEpisodes: (id: number, page = 1) =>
    animeClient.get(`/anime/${id}/episodes?page=${page}`),
  search: (q: string, page = 1) =>
    animeClient.get(`/anime/search?q=${q}&page=${page}`),
  getGenres: () => animeClient.get('/anime/genres'),
  getByGenre: (genreId: number, page = 1) =>
    animeClient.get(`/anime/genre/${genreId}?page=${page}`),
  getSeasonNow: (page = 1) => animeClient.get(`/anime/season/now?page=${page}`),
  getRecommendations: (id: number) =>
    animeClient.get(`/anime/${id}/recommendations`),
  getRelations: (id: number) =>
    animeClient.get(`/anime/${id}/relations`),
  // Watch / streaming source endpoints (Consumet)
  watchSearch: (query: string) =>
    animeClient.get(`/anime/watch/search?q=${encodeURIComponent(query)}`),
  watchEpisodes: (animeSlug: string, provider?: string) =>
    animeClient.get(`/anime/watch/episodes/${encodeURIComponent(animeSlug)}${provider ? `?provider=${provider}` : ''}`),
  findEpisodes: (title: string) =>
    animeClient.get(`/anime/watch/find-episodes?title=${encodeURIComponent(title)}`),
  watchSources: (episodeId: string, provider?: string) => {
    // Episode IDs can be "slug?ep=12345" — split into path + query param
    const [slug, epPart] = episodeId.split('?ep=');
    const params = new URLSearchParams();
    if (epPart) params.set('ep', epPart);
    if (provider) params.set('provider', provider);
    const qs = params.toString();
    return animeClient.get(`/anime/watch/sources/${encodeURIComponent(slug)}${qs ? `?${qs}` : ''}`);
  },
  // Aniwatch database endpoints
  watchHome: () => animeClient.get('/anime/watch/home'),
  watchCategory: (category: string, page = 1) =>
    animeClient.get(`/anime/watch/category/${encodeURIComponent(category)}?page=${page}`),
  watchGenre: (genre: string, page = 1) =>
    animeClient.get(`/anime/watch/genre/${encodeURIComponent(genre)}?page=${page}`),
};

// ---- User API ----
export const userApi = {
  getProfile: () => userClient.get('/users/profile'),
  updateProfile: (data: { username?: string; avatarUrl?: string; bio?: string }) =>
    userClient.put('/users/profile', data),
  getWatchHistory: (limit = 20) =>
    userClient.get(`/users/watch-history?limit=${limit}`),
  getContinueWatching: () => userClient.get('/users/continue-watching'),
  updateWatchProgress: (data: any) =>
    userClient.post('/users/watch-progress', data),
  getFavorites: () => userClient.get('/users/favorites'),
  addFavorite: (data: { animeId: number; animeTitle?: string; thumbnailUrl?: string }) =>
    userClient.post('/users/favorites', data),
  removeFavorite: (animeId: number) =>
    userClient.delete(`/users/favorites/${animeId}`),
  checkFavorite: (animeId: number) =>
    userClient.get(`/users/favorites/${animeId}/check`),
};

// ---- Streaming API ----
export const streamingApi = {
  getAnimeStreams: (animeId: number) =>
    streamingClient.get(`/streaming/anime/${animeId}/episodes`),
  getEpisodeStream: (animeId: number, episodeNumber: number) =>
    streamingClient.get(`/streaming/anime/${animeId}/episode/${episodeNumber}`),
  getSignedUrl: (streamFileId: string) =>
    streamingClient.get(`/streaming/signed-url/${streamFileId}`),
  reportWatchEvent: (data: any) =>
    streamingClient.post('/streaming/watch-event', data),
};

// ---- Subscription API ----
export const subscriptionApi = {
  getCurrent: () => subscriptionClient.get('/subscriptions/current'),
  getPlans: () => subscriptionClient.get('/subscriptions/plans'),
  activate: (plan: string) => subscriptionClient.post('/subscriptions/activate', { plan }),
  deactivate: () => subscriptionClient.post('/subscriptions/deactivate'),
  checkStatus: () => subscriptionClient.get('/subscriptions/status'),
};

export default api;
