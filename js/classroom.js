// ============================================
// CLASSROOM MODE - Teacher Dashboard & Student View
// With Google Sign-In and Cloudflare D1 persistence
// ============================================

// API Configuration
const CLASSROOM_API_URL = 'https://historical-chatbot-classroom.ultisim.workers.dev';
// Note: This worker URL will be created when you deploy the worker

// Google OAuth Client ID (will be set from config)
let GOOGLE_CLIENT_ID = '';

// Classroom state
let classroomState = {
  role: null, // 'teacher' or 'student'
  teacher: null, // { id, email, name, picture }
  idToken: null, // Google ID token for API auth
  studentName: '',
  studentId: null,
  classes: [],
  currentClassId: null,
  currentClass: null,
  students: {},  // { classId: [students] }
  assignments: {}, // { classId: [assignments] }
  scores: {}, // { classId: [scores] }
  activities: {} // { classId: [activities] }
};

// Pre-made curriculum templates
const curriculumTemplates = [
  {
    id: 'cleopatra',
    icon: '👑',
    name: 'Cleopatra',
    period: 'Ancient Egypt',
    figure: 'Cleopatra',
    title: 'Life in Ancient Egypt',
    instructions: 'Chat with Cleopatra to learn about ruling ancient Egypt, her relationships with Rome, and daily life along the Nile. Take the quiz when you feel ready!'
  },
  {
    id: 'einstein',
    icon: '🔬',
    name: 'Albert Einstein',
    period: 'Modern Science',
    figure: 'Albert Einstein',
    title: 'Understanding Relativity',
    instructions: 'Discuss the theory of relativity, the nature of light, and Einstein\'s journey as a scientist. Complete the quiz to test your understanding.'
  },
  {
    id: 'lincoln',
    icon: '🎩',
    name: 'Abraham Lincoln',
    period: 'Civil War Era',
    figure: 'Abraham Lincoln',
    title: 'The Civil War & Emancipation',
    instructions: 'Learn about the American Civil War, the Emancipation Proclamation, and Lincoln\'s leadership during America\'s most challenging period.'
  },
  {
    id: 'curie',
    icon: '⚛️',
    name: 'Marie Curie',
    period: 'Scientific Revolution',
    figure: 'Marie Curie',
    title: 'Pioneering Radioactivity',
    instructions: 'Explore the discovery of radioactivity, the challenges of being a woman in science, and Curie\'s groundbreaking research.'
  },
  {
    id: 'caesar',
    icon: '⚔️',
    name: 'Julius Caesar',
    period: 'Roman Empire',
    figure: 'Julius Caesar',
    title: 'The Rise of Rome',
    instructions: 'Discuss Roman military campaigns, political intrigue, and the transformation from Republic to Empire with one of history\'s most famous leaders.'
  },
  {
    id: 'shakespeare',
    icon: '🎭',
    name: 'William Shakespeare',
    period: 'Elizabethan Era',
    figure: 'William Shakespeare',
    title: 'The Art of Drama',
    instructions: 'Explore the world of Elizabethan theater, Shakespeare\'s famous plays, and the art of storytelling through drama.'
  },
  {
    id: 'tubman',
    icon: '🌟',
    name: 'Harriet Tubman',
    period: 'Antebellum America',
    figure: 'Harriet Tubman',
    title: 'The Underground Railroad',
    instructions: 'Learn about the Underground Railroad, the fight against slavery, and Tubman\'s incredible courage and determination.'
  },
  {
    id: 'davinci',
    icon: '🎨',
    name: 'Leonardo da Vinci',
    period: 'Italian Renaissance',
    figure: 'Leonardo da Vinci',
    title: 'Art & Invention',
    instructions: 'Explore the Renaissance through the eyes of its greatest polymath. Discuss art, science, engineering, and the pursuit of knowledge.'
  }
];

// DOM Elements
let roleScreen, studentJoinScreen, teacherDashboard, studentClassroom;

// Initialize classroom mode
document.addEventListener('DOMContentLoaded', () => {
  // Get Google Client ID from config (set in config.js)
  if (typeof GOOGLE_OAUTH_CLIENT_ID !== 'undefined') {
    GOOGLE_CLIENT_ID = GOOGLE_OAUTH_CLIENT_ID;
    // Update the Google Sign-In button with the client ID
    const gIdOnload = document.getElementById('g_id_onload');
    if (gIdOnload) {
      gIdOnload.setAttribute('data-client_id', GOOGLE_CLIENT_ID);
    }
  }

  // Get main screens
  roleScreen = document.getElementById('role-screen');
  studentJoinScreen = document.getElementById('student-join-screen');
  teacherDashboard = document.getElementById('teacher-dashboard');
  studentClassroom = document.getElementById('student-classroom');

  // Role selection - student only needs click handler
  document.getElementById('student-role-btn')?.addEventListener('click', () => showStudentJoin());
  document.getElementById('back-to-roles')?.addEventListener('click', () => showScreen('role'));

  // Student join
  document.getElementById('join-class-btn')?.addEventListener('click', joinClass);
  document.getElementById('leave-class-btn')?.addEventListener('click', leaveClass);

  // Teacher dashboard
  document.getElementById('create-class-btn')?.addEventListener('click', () => showCreateClassModal());
  document.getElementById('create-first-class-btn')?.addEventListener('click', () => showCreateClassModal());
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Create class modal
  document.getElementById('close-create-class')?.addEventListener('click', () => hideModal('create-class-modal'));
  document.getElementById('cancel-create-class')?.addEventListener('click', () => hideModal('create-class-modal'));
  document.getElementById('confirm-create-class')?.addEventListener('click', createClass);

  // Add assignment modal
  document.getElementById('add-assignment-btn')?.addEventListener('click', () => showAddAssignmentModal());
  document.getElementById('add-first-assignment-btn')?.addEventListener('click', () => showAddAssignmentModal());
  document.getElementById('close-add-assignment')?.addEventListener('click', () => hideModal('add-assignment-modal'));
  document.getElementById('cancel-add-assignment')?.addEventListener('click', () => hideModal('add-assignment-modal'));
  document.getElementById('confirm-add-assignment')?.addEventListener('click', addAssignment);

  // Copy class code
  document.getElementById('copy-code-btn')?.addEventListener('click', copyClassCode);

  // Export scores
  document.getElementById('export-scores-btn')?.addEventListener('click', exportScores);

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Populate templates
  populateTemplates();

  // Check for existing session
  checkExistingSession();

  console.log('Classroom mode initialized with Google Sign-In');
});

// ============================================
// GOOGLE SIGN-IN HANDLER
// ============================================

// This function is called by the Google Sign-In button
window.handleGoogleSignIn = async function(response) {
  console.log('Google Sign-In callback received');

  if (!response.credential) {
    console.error('No credential in response');
    showError('Sign-in failed. Please try again.');
    return;
  }

  try {
    // Show loading state
    const signinContainer = document.getElementById('google-signin-container');
    if (signinContainer) {
      signinContainer.innerHTML = '<div class="signin-loading">Signing in...</div>';
    }

    // Send token to our API
    const apiResponse = await fetch(`${CLASSROOM_API_URL}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken: response.credential })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    // Store teacher info and token
    classroomState.teacher = data.teacher;
    classroomState.idToken = response.credential;
    classroomState.role = 'teacher';

    // Save to session storage for persistence within tab
    sessionStorage.setItem('classroom_teacher', JSON.stringify(data.teacher));
    sessionStorage.setItem('classroom_token', response.credential);

    // Load teacher's classes and show dashboard
    await loadTeacherClasses();
    showTeacherDashboard();

  } catch (error) {
    console.error('Sign-in error:', error);
    showError('Sign-in failed: ' + error.message);

    // Restore sign-in button
    const signinContainer = document.getElementById('google-signin-container');
    if (signinContainer) {
      signinContainer.innerHTML = `
        <div class="g_id_signin"
          data-type="standard"
          data-shape="rectangular"
          data-theme="outline"
          data-text="signin_with"
          data-size="large"
          data-logo_alignment="left">
        </div>
      `;
      // Re-render Google button
      google.accounts.id.renderButton(
        signinContainer.querySelector('.g_id_signin'),
        { theme: 'outline', size: 'large', text: 'signin_with' }
      );
    }
  }
};

// Check for existing session on page load
async function checkExistingSession() {
  const savedTeacher = sessionStorage.getItem('classroom_teacher');
  const savedToken = sessionStorage.getItem('classroom_token');

  if (savedTeacher && savedToken) {
    try {
      // Verify token is still valid
      const response = await fetch(`${CLASSROOM_API_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });

      const data = await response.json();

      if (data.valid && data.teacher) {
        classroomState.teacher = data.teacher;
        classroomState.idToken = savedToken;
        classroomState.role = 'teacher';

        await loadTeacherClasses();
        showTeacherDashboard();
        return;
      }
    } catch (error) {
      console.log('Session verification failed:', error);
    }

    // Clear invalid session
    sessionStorage.removeItem('classroom_teacher');
    sessionStorage.removeItem('classroom_token');
  }

  // Check for student session
  const savedStudent = sessionStorage.getItem('classroom_student');
  if (savedStudent) {
    try {
      const studentData = JSON.parse(savedStudent);
      classroomState.studentName = studentData.name;
      classroomState.studentId = studentData.id;
      classroomState.currentClassId = studentData.classId;
      classroomState.currentClass = studentData.class;
      classroomState.role = 'student';

      showStudentClassroom(studentData.class);
      return;
    } catch (error) {
      sessionStorage.removeItem('classroom_student');
    }
  }
}

// Handle logout
function handleLogout() {
  // Clear session
  classroomState.teacher = null;
  classroomState.idToken = null;
  classroomState.role = null;
  classroomState.classes = [];
  classroomState.currentClassId = null;

  sessionStorage.removeItem('classroom_teacher');
  sessionStorage.removeItem('classroom_token');

  // Sign out of Google
  if (typeof google !== 'undefined' && google.accounts) {
    google.accounts.id.disableAutoSelect();
  }

  showScreen('role');

  // Re-initialize Google Sign-In button
  setTimeout(() => {
    if (typeof google !== 'undefined' && google.accounts && GOOGLE_CLIENT_ID) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn
      });
      const signinContainer = document.getElementById('google-signin-container');
      if (signinContainer) {
        google.accounts.id.renderButton(
          signinContainer.querySelector('.g_id_signin'),
          { theme: 'outline', size: 'large', text: 'signin_with' }
        );
      }
    }
  }, 100);
}

// ============================================
// API HELPERS
// ============================================

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (classroomState.idToken) {
    headers['Authorization'] = `Bearer ${classroomState.idToken}`;
  }

  const response = await fetch(`${CLASSROOM_API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ============================================
// SCREEN MANAGEMENT
// ============================================

function showScreen(screen) {
  roleScreen?.classList.add('hidden');
  studentJoinScreen?.classList.add('hidden');
  teacherDashboard?.classList.add('hidden');
  studentClassroom?.classList.add('hidden');

  switch(screen) {
    case 'role':
      roleScreen?.classList.remove('hidden');
      break;
    case 'student-join':
      studentJoinScreen?.classList.remove('hidden');
      break;
    case 'teacher':
      teacherDashboard?.classList.remove('hidden');
      break;
    case 'student':
      studentClassroom?.classList.remove('hidden');
      break;
  }
}

function showTeacherDashboard() {
  showScreen('teacher');

  // Update teacher display
  const teacherDisplay = document.getElementById('teacher-display-name');
  if (teacherDisplay && classroomState.teacher) {
    if (classroomState.teacher.picture) {
      teacherDisplay.innerHTML = `
        <span class="teacher-profile">
          <img src="${classroomState.teacher.picture}" alt="" class="teacher-avatar">
          ${classroomState.teacher.name}
        </span>
      `;
    } else {
      teacherDisplay.textContent = classroomState.teacher.name || classroomState.teacher.email;
    }
  }

  updateDashboard();
}

function showStudentJoin() {
  classroomState.role = 'student';
  showScreen('student-join');
}

// ============================================
// TEACHER FUNCTIONS
// ============================================

async function loadTeacherClasses() {
  try {
    const data = await apiRequest('/api/classes');
    classroomState.classes = data.classes || [];
  } catch (error) {
    console.error('Failed to load classes:', error);
    classroomState.classes = [];
  }
}

function showCreateClassModal() {
  document.getElementById('new-class-name').value = '';
  document.getElementById('new-class-code').value = '';

  // Hide teacher name field since we have it from Google
  const teacherNameGroup = document.getElementById('teacher-name')?.parentElement;
  if (teacherNameGroup) {
    teacherNameGroup.style.display = 'none';
  }

  document.getElementById('create-class-modal').classList.remove('hidden');
}

function hideModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
}

async function createClass() {
  const className = document.getElementById('new-class-name').value.trim();
  const classCode = document.getElementById('new-class-code').value.trim().toUpperCase();

  if (!className) {
    alert('Please enter a class name');
    return;
  }

  try {
    const data = await apiRequest('/api/classes', {
      method: 'POST',
      body: JSON.stringify({
        name: className,
        code: classCode || undefined
      })
    });

    // Reload classes
    await loadTeacherClasses();

    hideModal('create-class-modal');
    updateDashboard();

    // Select the new class
    if (data.class?.id) {
      selectClass(data.class.id);
    }

  } catch (error) {
    console.error('Failed to create class:', error);
    alert('Failed to create class: ' + error.message);
  }
}

function updateDashboard() {
  const classList = document.getElementById('class-list');
  const emptyState = document.getElementById('empty-state');
  const classView = document.getElementById('class-view');

  if (classroomState.classes.length === 0) {
    emptyState?.classList.remove('hidden');
    classView?.classList.add('hidden');
    if (classList) {
      classList.innerHTML = '<li class="class-item" style="opacity: 0.6; cursor: default;"><span class="class-item-name">No classes yet</span></li>';
    }
  } else {
    emptyState?.classList.add('hidden');

    // Populate class list
    if (classList) {
      classList.innerHTML = classroomState.classes.map(cls => `
        <li class="class-item ${classroomState.currentClassId === cls.id ? 'active' : ''}" data-class-id="${cls.id}">
          <div class="class-item-name">${cls.name}</div>
          <div class="class-item-meta">
            <span>${cls.code}</span>
            <span>${cls.student_count || 0} students</span>
          </div>
        </li>
      `).join('');

      // Add click handlers
      classList.querySelectorAll('.class-item').forEach(item => {
        if (item.dataset.classId) {
          item.addEventListener('click', () => selectClass(item.dataset.classId));
        }
      });
    }

    // Show first class if none selected
    if (!classroomState.currentClassId && classroomState.classes.length > 0) {
      selectClass(classroomState.classes[0].id);
    }
  }
}

async function selectClass(classId) {
  classroomState.currentClassId = classId;
  const cls = classroomState.classes.find(c => c.id === classId);

  if (!cls) return;

  classroomState.currentClass = cls;

  const classView = document.getElementById('class-view');
  classView?.classList.remove('hidden');

  // Update header
  document.getElementById('class-title').textContent = cls.name;
  document.getElementById('class-code-value').textContent = cls.code;
  document.getElementById('empty-class-code').textContent = cls.code;

  // Update active class in sidebar
  document.querySelectorAll('.class-item').forEach(item => {
    item.classList.toggle('active', item.dataset.classId === classId);
  });

  // Load class data
  await loadClassData(classId);

  // Update counts
  const students = classroomState.students[classId] || [];
  const assignments = classroomState.assignments[classId] || [];
  document.getElementById('student-count').textContent = students.length;
  document.getElementById('assignment-count').textContent = assignments.length;

  // Refresh current tab
  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'students';
  switchTab(activeTab);
}

async function loadClassData(classId) {
  try {
    // Load students, assignments, scores, and activities in parallel
    const [studentsRes, assignmentsRes, scoresRes, activitiesRes] = await Promise.all([
      apiRequest(`/api/classes/${classId}/students`),
      apiRequest(`/api/classes/${classId}/assignments`),
      apiRequest(`/api/classes/${classId}/scores`),
      apiRequest(`/api/classes/${classId}/activities`)
    ]);

    classroomState.students[classId] = studentsRes.students || [];
    classroomState.assignments[classId] = assignmentsRes.assignments || [];
    classroomState.scores[classId] = scoresRes.scores || [];
    classroomState.activities[classId] = activitiesRes.activities || [];

  } catch (error) {
    console.error('Failed to load class data:', error);
  }
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  document.getElementById(`${tabName}-tab`)?.classList.remove('hidden');

  // Load tab content
  switch(tabName) {
    case 'students':
      loadStudentsTab();
      break;
    case 'assignments':
      loadAssignmentsTab();
      break;
    case 'scores':
      loadScoresTab();
      break;
    case 'activity':
      loadActivityTab();
      break;
  }
}

function loadStudentsTab() {
  const container = document.getElementById('students-list');
  const students = classroomState.students[classroomState.currentClassId] || [];

  if (students.length === 0) {
    container.innerHTML = `
      <div class="empty-panel">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <p>No students have joined yet</p>
        <span>Share your class code: <strong>${classroomState.currentClass?.code || ''}</strong></span>
      </div>
    `;
  } else {
    container.innerHTML = students.map(student => `
      <div class="student-card">
        <div class="student-avatar">${getInitials(student.name)}</div>
        <div class="student-info">
          <p class="student-name">${student.name}</p>
          <p class="student-status">
            ${student.quizzes_taken || 0} quizzes taken
          </p>
        </div>
      </div>
    `).join('');
  }
}

function loadAssignmentsTab() {
  const container = document.getElementById('assignments-list');
  const assignments = classroomState.assignments[classroomState.currentClassId] || [];

  if (assignments.length === 0) {
    container.innerHTML = `
      <div class="empty-panel">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        <p>No assignments yet</p>
        <button class="secondary-btn" onclick="showAddAssignmentModal()">Add Assignment</button>
      </div>
    `;
  } else {
    container.innerHTML = assignments.map(assignment => `
      <div class="assignment-card">
        <div class="assignment-header">
          <h4 class="assignment-title">${assignment.title}</h4>
          <span class="assignment-figure">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            ${assignment.figure}
          </span>
        </div>
        <p style="font-family: 'Cormorant Garamond', serif; color: var(--ink-muted); margin: 0.5rem 0;">${assignment.instructions || ''}</p>
        <div class="assignment-meta">
          ${assignment.due_date ? `<span>Due: ${new Date(assignment.due_date).toLocaleDateString()}</span>` : ''}
          <span>${assignment.quiz_required ? '📝 Quiz Required' : '💬 Chat Only'}</span>
        </div>
      </div>
    `).join('');
  }
}

function loadScoresTab() {
  const tbody = document.getElementById('scores-tbody');
  const noScores = document.getElementById('no-scores');
  const scores = classroomState.scores[classroomState.currentClassId] || [];

  if (scores.length === 0) {
    tbody.innerHTML = '';
    noScores?.classList.remove('hidden');
  } else {
    noScores?.classList.add('hidden');
    tbody.innerHTML = scores.map(score => {
      const scoreClass = score.percentage >= 80 ? 'excellent' :
                        score.percentage >= 60 ? 'good' :
                        score.percentage >= 40 ? 'average' : 'needs-work';
      return `
        <tr>
          <td>${score.student_name}</td>
          <td>${score.assignment_title}</td>
          <td><span class="score-badge ${scoreClass}">${score.percentage}%</span></td>
          <td>${new Date(score.completed_at).toLocaleDateString()}</td>
        </tr>
      `;
    }).join('');
  }
}

function loadActivityTab() {
  const container = document.getElementById('activity-feed');
  const activities = classroomState.activities[classroomState.currentClassId] || [];

  if (activities.length === 0) {
    container.innerHTML = `
      <div class="empty-panel">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        <p>No activity yet</p>
        <span>Student activity will appear here in real-time</span>
      </div>
    `;
  } else {
    container.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon ${activity.type}">
          ${getActivityIcon(activity.type)}
        </div>
        <div class="activity-content">
          <p class="activity-text">${activity.message}</p>
          <span class="activity-time">${getTimeAgo(activity.created_at)}</span>
        </div>
      </div>
    `).join('');
  }
}

// Get activity icon
function getActivityIcon(type) {
  const icons = {
    chat: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    quiz: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    join: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>',
    create: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
  };
  return icons[type] || icons.chat;
}

// Get time ago string
function getTimeAgo(timestamp) {
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Get initials from name
function getInitials(name) {
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

// Copy class code
function copyClassCode() {
  const code = document.getElementById('class-code-value')?.textContent;
  if (code) {
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('copy-code-btn');
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      setTimeout(() => {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      }, 2000);
    });
  }
}

// Populate templates
function populateTemplates() {
  const container = document.getElementById('template-grid');
  if (!container) return;

  container.innerHTML = curriculumTemplates.map(template => `
    <div class="template-card" data-template-id="${template.id}">
      <div class="template-icon">${template.icon}</div>
      <p class="template-name">${template.name}</p>
      <p class="template-period">${template.period}</p>
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => selectTemplate(card.dataset.templateId));
  });
}

// Select template
function selectTemplate(templateId) {
  const template = curriculumTemplates.find(t => t.id === templateId);
  if (!template) return;

  // Update form fields
  document.getElementById('assignment-figure').value = template.figure;
  document.getElementById('assignment-title').value = template.title;
  document.getElementById('assignment-instructions').value = template.instructions;
  document.getElementById('quiz-required').checked = true;

  // Highlight selected template
  document.querySelectorAll('.template-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.templateId === templateId);
  });
}

// Show add assignment modal
function showAddAssignmentModal() {
  document.getElementById('assignment-figure').value = '';
  document.getElementById('assignment-title').value = '';
  document.getElementById('assignment-instructions').value = '';
  document.getElementById('assignment-due-date').value = '';
  document.getElementById('quiz-required').checked = true;
  document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('add-assignment-modal').classList.remove('hidden');
}

// Add assignment
async function addAssignment() {
  const figure = document.getElementById('assignment-figure').value.trim();
  const title = document.getElementById('assignment-title').value.trim();
  const instructions = document.getElementById('assignment-instructions').value.trim();
  const dueDate = document.getElementById('assignment-due-date').value;
  const quizRequired = document.getElementById('quiz-required').checked;

  if (!figure) {
    alert('Please enter a historical figure');
    return;
  }

  if (!title) {
    alert('Please enter an assignment title');
    return;
  }

  const classId = classroomState.currentClassId;

  try {
    await apiRequest(`/api/classes/${classId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({
        figure,
        title,
        instructions: instructions || null,
        dueDate: dueDate || null,
        quizRequired
      })
    });

    // Reload assignments
    const assignmentsRes = await apiRequest(`/api/classes/${classId}/assignments`);
    classroomState.assignments[classId] = assignmentsRes.assignments || [];

    hideModal('add-assignment-modal');

    // Update count
    document.getElementById('assignment-count').textContent = classroomState.assignments[classId].length;

    // Refresh if on assignments tab
    if (!document.getElementById('assignments-tab')?.classList.contains('hidden')) {
      loadAssignmentsTab();
    }

  } catch (error) {
    console.error('Failed to add assignment:', error);
    alert('Failed to add assignment: ' + error.message);
  }
}

// Export scores as CSV
function exportScores() {
  const scores = classroomState.scores[classroomState.currentClassId] || [];
  if (scores.length === 0) {
    alert('No scores to export');
    return;
  }

  const cls = classroomState.currentClass;
  const headers = ['Student', 'Assignment', 'Score', 'Date'];
  const rows = scores.map(s => [s.student_name, s.assignment_title, `${s.percentage}%`, new Date(s.completed_at).toLocaleDateString()]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cls?.name || 'class'}_scores.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// STUDENT FUNCTIONS
// ============================================

async function joinClass() {
  const studentName = document.getElementById('student-name').value.trim();
  const classCode = document.getElementById('class-code-input').value.trim().toUpperCase();

  if (!studentName) {
    showJoinError('Please enter your name');
    return;
  }

  if (!classCode) {
    showJoinError('Please enter a class code');
    return;
  }

  try {
    const response = await fetch(`${CLASSROOM_API_URL}/api/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: studentName, code: classCode })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to join class');
    }

    // Store student session
    classroomState.studentName = data.student.name;
    classroomState.studentId = data.student.id;
    classroomState.currentClassId = data.class.id;
    classroomState.currentClass = data.class;
    classroomState.role = 'student';

    sessionStorage.setItem('classroom_student', JSON.stringify({
      id: data.student.id,
      name: data.student.name,
      classId: data.class.id,
      class: data.class
    }));

    showStudentClassroom(data.class);

  } catch (error) {
    console.error('Failed to join class:', error);
    showJoinError(error.message);
  }
}

function showJoinError(message) {
  const errorDiv = document.getElementById('join-error');
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
  setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

async function showStudentClassroom(cls) {
  showScreen('student');

  document.getElementById('student-class-code').textContent = cls.code;
  document.getElementById('student-class-name').textContent = cls.name;
  document.getElementById('student-name-display').textContent = classroomState.studentName;

  await loadStudentAssignments();
}

async function loadStudentAssignments() {
  const container = document.getElementById('student-assignments');

  try {
    const response = await fetch(`${CLASSROOM_API_URL}/api/student/assignments?classId=${classroomState.currentClassId}&studentId=${classroomState.studentId}`);
    const data = await response.json();
    const assignments = data.assignments || [];

    if (assignments.length === 0) {
      container.innerHTML = `
        <div class="empty-panel">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <p>No assignments yet</p>
          <span>Your teacher will add assignments soon</span>
        </div>
      `;
    } else {
      container.innerHTML = assignments.map(assignment => `
        <div class="student-assignment-card ${assignment.completed ? 'completed' : ''}">
          <h3>${assignment.title}</h3>
          <p class="figure-name">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Chat with ${assignment.figure}
          </p>
          ${assignment.instructions ? `<p class="instructions">${assignment.instructions}</p>` : ''}
          ${assignment.completed ? `<p class="score-display">Score: ${assignment.score}%</p>` : ''}
          <div class="assignment-actions">
            <a href="index.html?figure=${encodeURIComponent(assignment.figure)}&student=${encodeURIComponent(classroomState.studentName)}&studentId=${classroomState.studentId}&class=${classroomState.currentClassId}&assignment=${assignment.id}" class="primary-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              ${assignment.completed ? 'Chat Again' : 'Start Chatting'}
            </a>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to load assignments:', error);
    container.innerHTML = '<div class="empty-panel"><p>Failed to load assignments</p></div>';
  }
}

function leaveClass() {
  if (confirm('Are you sure you want to leave the class?')) {
    classroomState.currentClassId = null;
    classroomState.studentName = '';
    classroomState.studentId = null;
    classroomState.role = null;

    sessionStorage.removeItem('classroom_student');
    showScreen('role');
  }
}

// Helper function to show errors
function showError(message) {
  alert(message); // For now, just use alert. Could be replaced with a toast notification
}

// Expose functions globally for onclick handlers
window.showAddAssignmentModal = showAddAssignmentModal;

console.log('Classroom.js loaded with API integration');
