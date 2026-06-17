const API_BASE = "/api";
const TOKEN_KEY = "prep_token";

function getAuthToken() {
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

function getAuthHeaders() {
  const token = getAuthToken();
  if (!token) {
    return {};
  }

  return { Authorization: `Bearer ${token}` };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  setAuthToken: (token) => {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    window.localStorage.removeItem(TOKEN_KEY);
  },
  getAuthToken,
  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  me: () => request("/auth/me"),
  getTests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/test/catalog/tests${query ? `?${query}` : ""}`);
  },
  getBankingPracticeSets: () => request("/test/banking/practice-sets"),
  getGatePracticeSets: () => request("/test/gate/practice-sets"),
  getBankingPracticeSetQuestions: (setId) => request(`/test/banking/practice-sets/${setId}/questions`),
  getBankingCourses: () => request("/test/banking/courses"),
  getBankingDashboard: () => request("/test/banking/dashboard"),
  getTestById: (testId) => request(`/test/${testId}`),
  flagQuestion: (questionId, payload = {}) =>
    request(`/test/questions/${questionId}/flag`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  submitTest: (payload) =>
    request("/test/submit", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getSolution: (submissionId) => request(`/test/solution/${submissionId}`),
  getUserAnalytics: (userId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/test/analytics/user/${userId}${query ? `?${query}` : ""}`);
  },
  getWeakTopics: (userId) => request(`/test/weak-topics/${userId}`),
  getAdminOverview: () => request("/admin/dashboard/overview"),
  getAdminReviewQueue: () => request("/test/admin/review/queue"),
  getAdminTests: () => request("/admin/tests"),
  createTest: (payload) =>
    request("/admin/tests", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  createQuestion: (payload) =>
    request("/admin/questions", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  addQuestionToTest: (testId, payload) =>
    request(`/admin/tests/${testId}/questions`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  createAdaptiveTest: (payload) =>
    request("/ai/adaptive-test", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  generateQuestionVariant: (payload) =>
    request("/ai/generate-question", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  publishTest: (testId, isPublished) =>
    request(`/admin/tests/${testId}/publish`, {
      method: "PATCH",
      body: JSON.stringify({ isPublished })
    })
};
