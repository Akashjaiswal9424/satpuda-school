// ============================================================
// SATPUDA VALLEY SCHOOL - API SERVICE LAYER
// ============================================================

const API_URL = 'https://satpuda-school.onrender.com';

// ============ CORE FETCH ============
async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include'
  };

  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
    config.body = options.body;
  } else if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const token = localStorage.getItem('sv_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

// ============ AUTH ============
const AuthAPI = {
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => {
    localStorage.removeItem('sv_token');
    localStorage.removeItem('sv_user');
    return apiRequest('/auth/logout', { method: 'POST' });
  },
  me: () => apiRequest('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    apiRequest('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    })
};

// ============ NOTICES ============
const NoticesAPI = {
  list: (params = {}) => apiRequest(`/notices?${new URLSearchParams(params)}`),
  create: (data) => apiRequest('/notices', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/notices/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/notices/${id}`, { method: 'DELETE' })
};

// ============ ENQUIRIES ============
const EnquiriesAPI = {
  submit: (data) => apiRequest('/enquiries', { method: 'POST', body: data }),
  list: (params = {}) => apiRequest(`/enquiries?${new URLSearchParams(params)}`),
  update: (id, data) => apiRequest(`/enquiries/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/enquiries/${id}`, { method: 'DELETE' })
};

// ============ VIDEOS ============
const VideosAPI = {
  list: () => apiRequest('/videos'),
  create: (data) => apiRequest('/videos', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/videos/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/videos/${id}`, { method: 'DELETE' })
};

// ============ GALLERY ============
const GalleryAPI = {
  list: (category) => apiRequest(`/gallery${category ? `?category=${category}` : ''}`),
  upload: (formData) => apiRequest('/gallery', { method: 'POST', body: formData }),
  remove: (id) => apiRequest(`/gallery/${id}`, { method: 'DELETE' })
};

// ============ DOWNLOADS ============
const DownloadsAPI = {
  list: (category) => apiRequest(`/downloads${category ? `?category=${category}` : ''}`),
  upload: (formData) => apiRequest('/downloads', { method: 'POST', body: formData }),
  remove: (id) => apiRequest(`/downloads/${id}`, { method: 'DELETE' })
};

// ============ FACULTY ============
const FacultyAPI = {
  list: () => apiRequest('/faculty'),
  create: (formData) => apiRequest('/faculty', { method: 'POST', body: formData }),
  update: (id, data) => apiRequest(`/faculty/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/faculty/${id}`, { method: 'DELETE' })
};

// ============ FEES ============
const FeesAPI = {
  list: () => apiRequest('/fees'),
  create: (data) => apiRequest('/fees', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/fees/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/fees/${id}`, { method: 'DELETE' })
};

// ============ EVENTS ============
const EventsAPI = {
  list: (params = {}) => apiRequest(`/events?${new URLSearchParams(params)}`),
  create: (data) => apiRequest('/events', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/events/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/events/${id}`, { method: 'DELETE' })
};

// ============ TESTIMONIALS ============
const TestimonialsAPI = {
  list: () => apiRequest('/testimonials'),
  create: (formData) => apiRequest('/testimonials', { method: 'POST', body: formData }),
  remove: (id) => apiRequest(`/testimonials/${id}`, { method: 'DELETE' })
};

// ============ ACHIEVEMENTS ============
const AchievementsAPI = {
  list: () => apiRequest('/achievements'),
  create: (formData) => apiRequest('/achievements', { method: 'POST', body: formData }),
  remove: (id) => apiRequest(`/achievements/${id}`, { method: 'DELETE' })
};

// ============ NEWS ============
const NewsAPI = {
  list: (params = {}) => apiRequest(`/news?${new URLSearchParams(params)}`),
  get: (slug) => apiRequest(`/news/${slug}`),
  create: (formData) => apiRequest('/news', { method: 'POST', body: formData }),
  remove: (id) => apiRequest(`/news/${id}`, { method: 'DELETE' })
};

// ============ HOLIDAYS ============
const HolidaysAPI = {
  list: () => apiRequest('/holidays'),
  create: (data) => apiRequest('/holidays', { method: 'POST', body: data }),
  remove: (id) => apiRequest(`/holidays/${id}`, { method: 'DELETE' })
};

// ============ CAREERS ============
const CareersAPI = {
  list: () => apiRequest('/careers'),
  create: (data) => apiRequest('/careers', { method: 'POST', body: data }),
  remove: (id) => apiRequest(`/careers/${id}`, { method: 'DELETE' })
};

// ============ ALUMNI ============
const AlumniAPI = {
  submit: (data) => apiRequest('/alumni', { method: 'POST', body: data }),
  list: (params = {}) => apiRequest(`/alumni?${new URLSearchParams(params)}`),
  update: (id, data) => apiRequest(`/alumni/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/alumni/${id}`, { method: 'DELETE' })
};

// ============ ALBUMS ============
const AlbumsAPI = {
  list: () => apiRequest('/albums'),
  get: (id) => apiRequest(`/albums/${id}`),
  create: (data) => apiRequest('/albums', { method: 'POST', body: data }),
  addPhotos: (id, formData) => apiRequest(`/albums/${id}/photos`, { method: 'POST', body: formData }),
  removePhoto: (albumId, photoId) =>
    apiRequest(`/albums/${albumId}/photos/${photoId}`, { method: 'DELETE' }),
  remove: (id) => apiRequest(`/albums/${id}`, { method: 'DELETE' })
};

// ============ PAYMENTS ============
const PaymentsAPI = {
  createOrder: (data) => apiRequest('/payments/create-order', { method: 'POST', body: data }),
  verify: (data) => apiRequest('/payments/verify', { method: 'POST', body: data }),
  status: (orderId) => apiRequest(`/payments/status/${orderId}`),
  list: () => apiRequest('/payments'),
  remove: (id) => apiRequest(`/payments/${id}`, { method: 'DELETE' })
};

// ============ TIMETABLE ============
const TimetableAPI = {
  list: (params = {}) => apiRequest(`/timetable?${new URLSearchParams(params)}`),
  get: (className) => apiRequest(`/timetable/${encodeURIComponent(className)}`),
  save: (data) => apiRequest('/timetable', { method: 'POST', body: data }),
  remove: (id) => apiRequest(`/timetable/${id}`, { method: 'DELETE' })
};

// ============ LIVE CLASSES ============
const LiveClassesAPI = {
  list: (params = {}) => apiRequest(`/live-classes?${new URLSearchParams(params)}`),
  create: (data) => apiRequest('/live-classes', { method: 'POST', body: data }),
  remove: (id) => apiRequest(`/live-classes/${id}`, { method: 'DELETE' })
};

// ============ ATTENDANCE ============
const AttendanceAPI = {
  bulkSave: (data) => apiRequest('/attendance/bulk', { method: 'POST', body: data }),
  student: (rollNo, className, params = {}) =>
    apiRequest(`/attendance/${encodeURIComponent(rollNo)}/${encodeURIComponent(className)}?${new URLSearchParams(params)}`),
  classToday: (className, date) =>
    apiRequest(`/attendance/class/${encodeURIComponent(className)}${date ? '?date=' + date : ''}`)
};

// ============ CHATBOT ============
const ChatbotAPI = {
  ask: (message) => apiRequest('/chatbot', { method: 'POST', body: { message } })
};

// ============ ANALYTICS ============
const AnalyticsAPI = {
  dashboard: () => apiRequest('/analytics/dashboard')
};

// ============ TOAST ============
function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-brand-forest',
    warning: 'bg-amber-600'
  };
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation'
  };
  const toast = document.createElement('div');
  toast.className = `fixed top-24 right-5 z-[9999] ${colors[type]} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-semibold transform translate-x-full transition-transform duration-300`;
  toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.style.transform = 'translateX(0)');
  setTimeout(() => {
    toast.style.transform = 'translateX(150%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============ LOADER ============
function showLoader(show = true) {
  let el = document.getElementById('globalLoader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'globalLoader';
    el.className = 'fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] hidden flex items-center justify-center';
    el.innerHTML = `
      <div class="bg-white dark:bg-brand-darkcard p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
        <div class="w-12 h-12 border-4 border-brand-mid border-t-brand-brightgold rounded-full animate-spin"></div>
        <span class="text-xs font-bold text-brand-forest dark:text-brand-brightgold">Loading...</span>
      </div>`;
    document.body.appendChild(el);
  }
  el.classList.toggle('hidden', !show);
}

// ============ EXPOSE ============
window.API = {
  Auth: AuthAPI,
  Notices: NoticesAPI,
  Enquiries: EnquiriesAPI,
  Videos: VideosAPI,
  Gallery: GalleryAPI,
  Downloads: DownloadsAPI,
  Faculty: FacultyAPI,
  Fees: FeesAPI,
  Events: EventsAPI,
  Testimonials: TestimonialsAPI,
  Achievements: AchievementsAPI,
  News: NewsAPI,
  Holidays: HolidaysAPI,
  Careers: CareersAPI,
  Alumni: AlumniAPI,
  Albums: AlbumsAPI,
  Payments: PaymentsAPI,
  Timetable: TimetableAPI,
  LiveClasses: LiveClassesAPI,
  Attendance: AttendanceAPI,
  Chatbot: ChatbotAPI,
  Analytics: AnalyticsAPI,
  showToast,
  showLoader
};

console.log('✅ API Layer loaded');