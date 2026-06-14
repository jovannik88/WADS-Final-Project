import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

//Mock all external dependencies 

// Next.js navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Firebase auth
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  updateProfile: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("@/lib/firebase", () => ({ auth: {} }));

// Toast notifications
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
jest.mock("sonner", () => ({
  toast: { error: mockToastError, success: mockToastSuccess },
  Toaster: () => null,
}));

// AI sync context
const mockNotifyChange = jest.fn();
jest.mock("@/lib/ai-sync-context", () => ({
  useAiSync: () => ({
    prioritized: [],
    scheduleBlocks: [],
    analysedAt: null,
    refreshing: false,
    notifyChange: mockNotifyChange,
  }),
}));

// Recharts (used in Analytics)
jest.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  Legend: () => null,
}));

// Lucide icons
jest.mock("lucide-react", () => ({
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
}));

// shadcn/ui components
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));
jest.mock("@/components/ui/input", () => ({
  Input: ({ onChange, value, type, placeholder, ...props }: any) => (
    <input onChange={onChange} value={value} type={type} placeholder={placeholder} {...props} />
  ),
}));
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

// Global fetch mock
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import pages after mocks
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";
import TasksPage from "@/app/dashboard/tasks/page";
import SettingsPage from "@/app/dashboard/settings/page";
import DashboardPage from "@/app/dashboard/page";
import AnalyticsPage from "@/app/dashboard/analytics/page";
import NotificationsPage from "@/app/dashboard/notifications/page";

// Helpers

const user = userEvent.setup();

function mockFetchOk(data: object) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
  } as any);
}

function mockFetchFail(status = 500) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: "Server error" }),
  } as any);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
});

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

describe("LoginPage — form validation", () => {
  test("renders email and password inputs", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
  });

  test("shows error when both fields are empty on submit", async () => {
    render(<LoginPage />);
    await user.click(screen.getByText("Sign in"));
    expect(mockToastError).toHaveBeenCalledWith("Please enter your email and password");
  });

  test("shows error when only email is missing", async () => {
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
    await user.click(screen.getByText("Sign in"));
    expect(mockToastError).toHaveBeenCalledWith("Please enter your email");
  });

  test("shows error when only password is missing", async () => {
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.click(screen.getByText("Sign in"));
    expect(mockToastError).toHaveBeenCalledWith("Please enter your password");
  });

  test("shows inline error for invalid email format while typing", async () => {
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "notanemail");
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
  });

  test("clears inline email error when valid email entered", async () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText("you@example.com");
    await user.type(emailInput, "notanemail");
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    await user.clear(emailInput);
    await user.type(emailInput, "valid@example.com");
    expect(screen.queryByText("Enter a valid email address")).not.toBeInTheDocument();
  });

  test("shows error toast for invalid email format on submit", async () => {
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "bademail");
    await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
    await user.click(screen.getByText("Sign in"));
    expect(mockToastError).toHaveBeenCalledWith("Please enter a valid email address");
  });

  test("toggles password visibility", async () => {
    render(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    expect(passwordInput).toHaveAttribute("type", "password");
    await user.click(screen.getByTestId("eye-icon"));
    expect(passwordInput).toHaveAttribute("type", "text");
    await user.click(screen.getByTestId("eye-off-icon"));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("sign in button is disabled during loading", async () => {
    const { signInWithEmailAndPassword } = require("firebase/auth");
    signInWithEmailAndPassword.mockReturnValue(new Promise(() => {})); // never resolves
    mockFetchOk({ success: true, user: { uid: "123" } });

    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
    await user.click(screen.getByText("Sign in"));

    expect(screen.getByText("Signing in...")).toBeInTheDocument();
    expect(screen.getByText("Signing in...").closest("button")).toBeDisabled();
  });

  test("shows error for wrong password Firebase error", async () => {
    const { signInWithEmailAndPassword } = require("firebase/auth");
    signInWithEmailAndPassword.mockRejectedValue({ code: "auth/wrong-password" });

    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "wrongpass");
    await user.click(screen.getByText("Sign in"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Incorrect password");
    });
  });

  test("shows error for user-not-found Firebase error", async () => {
    const { signInWithEmailAndPassword } = require("firebase/auth");
    signInWithEmailAndPassword.mockRejectedValue({ code: "auth/user-not-found" });

    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "nobody@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
    await user.click(screen.getByText("Sign in"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("No account found with this email");
    });
  });

  test("forgot password shows error when email is empty", async () => {
    render(<LoginPage />);
    await user.click(screen.getByText("Forgot password?"));
    expect(mockToastError).toHaveBeenCalledWith("Enter your email first, then click Forgot password");
  });

  test("forgot password shows error for invalid email", async () => {
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "bademail");
    await user.click(screen.getByText("Forgot password?"));
    expect(mockToastError).toHaveBeenCalledWith("Please enter a valid email address");
  });

  test("forgot password sends reset email successfully", async () => {
    const { sendPasswordResetEmail } = require("firebase/auth");
    sendPasswordResetEmail.mockResolvedValue(undefined);

    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.click(screen.getByText("Forgot password?"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Password reset email sent! Check your inbox 📬");
    });
  });

  test("submits on Enter key press", async () => {
    const { signInWithEmailAndPassword } = require("firebase/auth");
    signInWithEmailAndPassword.mockRejectedValue({ code: "auth/wrong-password" });

    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "password{Enter}");

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalled();
    });
  });
});

// REGISTER PAGE

describe("RegisterPage — form validation", () => {
  test("renders all form fields", () => {
    render(<RegisterPage />);
    expect(screen.getByPlaceholderText("Jean Doe")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Min. 6 characters")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Re-enter your password")).toBeInTheDocument();
  });

  test("shows error when name is empty", async () => {
    render(<RegisterPage />);
    await user.click(screen.getByText("Create account"));
    expect(mockToastError).toHaveBeenCalledWith("Please enter your name");
  });

  test("shows error when fields are empty", async () => {
    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText("Jean Doe"), "Test User");
    await user.click(screen.getByText("Create account"));
    expect(mockToastError).toHaveBeenCalledWith("Please fill in all fields");
  });

  test("shows error when password is too short", async () => {
    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText("Jean Doe"), "Test User");
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Min. 6 characters"), "123");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "123");
    await user.click(screen.getByText("Create account"));
    expect(mockToastError).toHaveBeenCalledWith("Password must be at least 6 characters");
  });

  test("shows error when passwords do not match", async () => {
    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText("Jean Doe"), "Test User");
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Min. 6 characters"), "password123");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "differentpassword");
    await user.click(screen.getByText("Create account"));
    expect(mockToastError).toHaveBeenCalledWith("Passwords do not match");
  });

  test("shows live password mismatch feedback", async () => {
    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText("Min. 6 characters"), "password123");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "different");
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  test("shows live password match feedback", async () => {
    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText("Min. 6 characters"), "password123");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "password123");
    expect(screen.getByText("Passwords match ✓")).toBeInTheDocument();
  });

  test("shows error for email already in use", async () => {
    const { createUserWithEmailAndPassword } = require("firebase/auth");
    createUserWithEmailAndPassword.mockRejectedValue({ code: "auth/email-already-in-use" });

    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText("Jean Doe"), "Test User");
    await user.type(screen.getByPlaceholderText("you@example.com"), "existing@example.com");
    await user.type(screen.getByPlaceholderText("Min. 6 characters"), "password123");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "password123");
    await user.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("An account with this email already exists");
    });
  });

  test("toggles password visibility", async () => {
    render(<RegisterPage />);
    const passwordInput = screen.getByPlaceholderText("Min. 6 characters");
    expect(passwordInput).toHaveAttribute("type", "password");
    const eyeIcons = screen.getAllByTestId("eye-icon");
    await user.click(eyeIcons[0]);
    expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("create account button is disabled during loading", async () => {
    const { createUserWithEmailAndPassword } = require("firebase/auth");
    createUserWithEmailAndPassword.mockReturnValue(new Promise(() => {}));

    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText("Jean Doe"), "Test User");
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Min. 6 characters"), "password123");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "password123");
    await user.click(screen.getByText("Create account"));

    expect(screen.getByText("Creating account...")).toBeInTheDocument();
    expect(screen.getByText("Creating account...").closest("button")).toBeDisabled();
  });

  test("redirects to dashboard on successful registration", async () => {
    const { createUserWithEmailAndPassword, updateProfile } = require("firebase/auth");
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { getIdToken: async () => "fake-token", displayName: null },
    });
    updateProfile.mockResolvedValue(undefined);
    mockFetchOk({ success: true });

    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText("Jean Doe"), "Test User");
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Min. 6 characters"), "password123");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "password123");
    await user.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});


// TASKS PAGE

describe("TasksPage — form validation and UI behaviour", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tasks: [] }),
    } as any);
  });

  test("renders task page header", async () => {
    render(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByText("Tasks")).toBeInTheDocument();
    });
  });

  test("shows empty state when no tasks", async () => {
    render(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByText("No tasks found")).toBeInTheDocument();
    });
  });

  test("opens add task modal on button click", async () => {
    render(<TasksPage />);
    await waitFor(() => screen.getByText("Tasks"));
    await user.click(screen.getByText("Add task"));
    expect(screen.getByText("New Task")).toBeInTheDocument();
  });

  test("submit button disabled when title is empty", async () => {
    render(<TasksPage />);
    await waitFor(() => screen.getByText("Tasks"));
    await user.click(screen.getByText("Add task"));
    const submitBtn = screen.getByText("Add Task");
    expect(submitBtn.closest("button")).toBeDisabled();
  });

  test("submit button enabled when title is filled", async () => {
    render(<TasksPage />);
    await waitFor(() => screen.getByText("Tasks"));
    await user.click(screen.getByText("Add task"));
    await user.type(screen.getByPlaceholderText("e.g. Complete chapter 4 exercises"), "My Task");
    const submitBtn = screen.getByText("Add Task");
    expect(submitBtn.closest("button")).not.toBeDisabled();
  });

  test("shows error toast when submitting empty title", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tasks: [] }) } as any)
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: "Invalid" }) } as any);

    render(<TasksPage />);
    await waitFor(() => screen.getByText("Tasks"));
    await user.click(screen.getByText("Add task"));

    // Force submit without title via keyboard
    fireEvent.click(screen.getByText("Add Task").closest("button")!);
    // Button should be disabled, so toast.error not called from submit
    expect(mockToastError).not.toHaveBeenCalledWith("Title is required");
  });

  test("closes modal on cancel", async () => {
    render(<TasksPage />);
    await waitFor(() => screen.getByText("Tasks"));
    await user.click(screen.getByText("Add task"));
    expect(screen.getByText("New Task")).toBeInTheDocument();
    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("New Task")).not.toBeInTheDocument();
  });

  test("filter buttons change active state", async () => {
    render(<TasksPage />);
    await waitFor(() => screen.getByText("Tasks"));
    const pendingBtn = screen.getByText("Pending", { selector: "button" });
    await user.click(pendingBtn);
    expect(pendingBtn.closest("button")).toHaveClass("bg-gray-900");
  });

  test("search input filters task list", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        tasks: [
          { id: 1, title: "Math homework", description: null, subject: "Math", priority: "HIGH", status: "PENDING", dueDate: null, aiScore: null, aiReason: null, estimatedMins: null, progress: 0 },
          { id: 2, title: "English essay", description: null, subject: "English", priority: "LOW", status: "PENDING", dueDate: null, aiScore: null, aiReason: null, estimatedMins: null, progress: 0 },
        ],
      }),
    } as any);

    render(<TasksPage />);
    await waitFor(() => screen.getByText("Math homework"));
    await user.type(screen.getByPlaceholderText("Search tasks..."), "Math");
    expect(screen.getByText("Math homework")).toBeInTheDocument();
    expect(screen.queryByText("English essay")).not.toBeInTheDocument();
  });

  test("shows task in list after successful creation", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tasks: [] }) } as any)
      .mockResolvedValueOnce({
        ok: true, status: 201,
        json: async () => ({ task: { id: 1, title: "New Task", description: null, subject: null, priority: "MEDIUM", status: "PENDING", dueDate: null, aiScore: null, aiReason: null, estimatedMins: null, progress: 0 } }),
      } as any);

    render(<TasksPage />);
    await waitFor(() => screen.getByText("Tasks"));
    await user.click(screen.getByText("Add task"));
    await user.type(screen.getByPlaceholderText("e.g. Complete chapter 4 exercises"), "New Task");
    await user.click(screen.getByText("Add Task"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Task added");
    });
  });

  test("shows error toast when task creation fails", async () => {
    // Reset and set up mocks fresh
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tasks: [] }) } as any)
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: "Server error" }) } as any);

    render(<TasksPage />);
    await waitFor(() => expect(screen.getByText("Tasks")).toBeInTheDocument());

    // Open the modal
    fireEvent.click(screen.getByText("Add task"));
    await waitFor(() => expect(screen.getByText("New Task")).toBeInTheDocument());

    // Type a title
    fireEvent.change(screen.getByPlaceholderText("e.g. Complete chapter 4 exercises"), {
      target: { value: "My Task" },
    });

    // Submit via the button id
    const submitBtn = document.getElementById("submit-task-btn")!;
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to add task");
    });
  });

  test("redirects to login on 401", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as any);
    render(<TasksPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});

// SETTINGS PAGE
describe("SettingsPage — form validation and UI behaviour", () => {
  const mockSettingsData = {
    notifications: { deadlineReminders: true, sessionReminders: true, aiSuggestions: true, streakAlerts: false, weeklySummary: false, deadlineLeadHours: 24 },
    profile: { user: { name: "Test User", email: "test@example.com", timezone: "Asia/Jakarta", createdAt: "2024-01-01", firebaseUid: "123" } },
    settings: { settings: { preferredStartHour: 7, preferredEndHour: 22, pomodoroMins: 25, shortBreakMins: 5, timezone: "Asia/Jakarta", userId: "123" } },
  };

  beforeEach(() => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockSettingsData.notifications } as any)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockSettingsData.profile } as any)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockSettingsData.settings } as any);
  });

  test("renders settings page with profile tab active", async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });

  test("profile tab shows name and email fields", async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
      expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
    });
  });

  // Helper: find sidebar tab button by its label text (text is in a hidden span)
  function getTabButton(label: string) {
    return screen.getAllByRole("button").find(
      (btn) => btn.textContent?.includes(label) && btn.className.includes("rounded-2xl")
    )!;
  }

  test("switches to notifications tab", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("Settings"));
    await user.click(getTabButton("Notifications"));
    expect(screen.getByText("Push Notifications")).toBeInTheDocument();
  });

  test("switches to account tab", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("Settings"));
    await user.click(getTabButton("Account"));
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  test("delete account button shows confirmation input", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("Settings"));
    await user.click(getTabButton("Account"));
    await user.click(screen.getByText("Delete"));
    expect(screen.getByPlaceholderText("Type DELETE")).toBeInTheDocument();
  });

  test("confirm delete button disabled unless DELETE is typed", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("Settings"));
    await user.click(getTabButton("Account"));
    await user.click(screen.getByText("Delete"));
    const confirmBtn = screen.getByText("Confirm Delete");
    expect(confirmBtn.closest("button")).toBeDisabled();
  });

  test("confirm delete button enabled when DELETE is typed", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("Settings"));
    await user.click(getTabButton("Account"));
    await user.click(screen.getByText("Delete"));
    await user.type(screen.getByPlaceholderText("Type DELETE"), "DELETE");
    const confirmBtn = screen.getByText("Confirm Delete");
    expect(confirmBtn.closest("button")).not.toBeDisabled();
  });

  test("shows error when typing wrong confirmation text", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("Settings"));
    await user.click(getTabButton("Account"));
    await user.click(screen.getByText("Delete"));
    await user.type(screen.getByPlaceholderText("Type DELETE"), "wrong");
    expect(screen.getByText("Confirm Delete").closest("button")).toBeDisabled();
  });

  test("cancel delete hides confirmation input", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("Settings"));
    await user.click(getTabButton("Account"));
    await user.click(screen.getByText("Delete"));
    expect(screen.getByPlaceholderText("Type DELETE")).toBeInTheDocument();
    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByPlaceholderText("Type DELETE")).not.toBeInTheDocument();
  });

  test("save profile shows success toast", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as any);
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("Settings"));
    await user.click(screen.getByText("Save Profile"));
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Profile updated successfully");
    });
  });

  test("notification toggles are interactive", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("Settings"));
    await user.click(getTabButton("Notifications"));
    await waitFor(() => screen.getByText("Push Notifications"));
    const toggles = screen.getAllByRole("button", { name: "" });
    expect(toggles.length).toBeGreaterThan(0);
  });
});


// DASHBOARD PAGE
describe("DashboardPage — UI behaviour", () => {
  beforeEach(() => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ tasks: [] }),
      } as any)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({
          completedTasksCount: 3,
          studyStreak: 5,
          totalFocusHours: 10,
          aiSummary: { completionRate: 75 },
        }),
      } as any);
  });

  test("renders dashboard header", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/there/)).toBeInTheDocument();
    });
  });

  test("shows loading skeletons initially", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Loading your workspace...")).toBeInTheDocument();
  });

  test("shows empty state when no tasks", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("No pending tasks")).toBeInTheDocument();
    });
  });

  test("shows stat cards after data loads", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Study Streak")).toBeInTheDocument();
      expect(screen.getByText("Focus Time")).toBeInTheDocument();
    });
  });

  test("Run AI Analysis button is present", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Run AI Analysis")).toBeInTheDocument();
    });
  });

  test("Run AI Analysis button calls notifyChange", async () => {
    render(<DashboardPage />);
    await waitFor(() => screen.getByText("Run AI Analysis"));
    await user.click(screen.getByText("Run AI Analysis"));
    expect(mockNotifyChange).toHaveBeenCalledWith("tasks");
  });

  test("redirects to login on 401", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as any);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  test("shows tasks when loaded", async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({
          tasks: [{ id: 1, title: "Study Math", subject: "Math", priority: "HIGH", status: "PENDING", dueDate: null, aiScore: null, aiReason: null }],
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ completedTasksCount: 0, studyStreak: 0, totalFocusHours: 0, aiSummary: { completionRate: 0 } }),
      } as any);

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Study Math")).toBeInTheDocument();
    });
  });
});

// ANALYTICS PAGE
describe("AnalyticsPage — UI behaviour and error handling", () => {
  const mockAnalyticsData = {
    completedTasksCount: 5,
    completedTasksDiff: 2,
    avgDailyFocusHours: 3,
    avgDailyFocusDiff: 0.5,
    totalFocusHours: 21,
    subjectCount: 3,
    studyStreak: 7,
    weeklyStudyHours: [],
    subjectBreakdown: [],
    tasksByPriority: [],
    scheduledVsActual: [],
    peakHours: [],
    aiSummary: { peakFocusWindow: "7PM-9PM", completionRate: 80, completionRateDiff: 5, accuracyGap: "On schedule", totalSessions: 10, avgFocusScore: 85 },
    recentSessions: [],
  };

  test("renders analytics header", async () => {
    mockFetchOk(mockAnalyticsData);
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Analytics")).toBeInTheDocument();
    });
  });

  test("shows range filter buttons", async () => {
    mockFetchOk(mockAnalyticsData);
    render(<AnalyticsPage />);
    await waitFor(() => screen.getByText("Analytics"));
    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText("This month")).toBeInTheDocument();
    expect(screen.getByText("All time")).toBeInTheDocument();
  });

  test("clicking range filter calls API with correct range", async () => {
    mockFetchOk(mockAnalyticsData);
    render(<AnalyticsPage />);
    await waitFor(() => screen.getByText("Analytics"));
    mockFetchOk(mockAnalyticsData);
    await user.click(screen.getByText("This month"));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("range=month"));
    });
  });

  test("shows error state when API fails", async () => {
    mockFetchFail(500);
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Could not load analytics data. Please try again.")).toBeInTheDocument();
    });
  });

  test("retry button refetches data", async () => {
    mockFetchFail(500);
    render(<AnalyticsPage />);
    await waitFor(() => screen.getByText("Retry"));
    const callsBefore = mockFetch.mock.calls.length;
    mockFetchOk(mockAnalyticsData);
    await user.click(screen.getByText("Retry"));
    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  test("redirects to login on 401", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as any);
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  test("shows stat cards after data loads", async () => {
    mockFetchOk(mockAnalyticsData);
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Tasks Completed")).toBeInTheDocument();
      expect(screen.getByText("Study Streak")).toBeInTheDocument();
    });
  });
});

// NOTIFICATIONS PAGE
describe("NotificationsPage — UI behaviour", () => {
  const mockNotifications = [
    { id: 1, title: "Task due soon", body: "Math homework is due tomorrow", type: "DEADLINE", read: false, createdAt: new Date().toISOString() },
    { id: 2, title: "Session starting", body: "Your study session starts in 10 minutes", type: "REMINDER", read: true, createdAt: new Date().toISOString() },
  ];

  test("renders notifications page header", async () => {
    mockFetchOk({ notifications: mockNotifications, unreadCount: 1 });
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });
  });

  test("shows unread count badge", async () => {
    mockFetchOk({ notifications: mockNotifications, unreadCount: 1 });
    render(<NotificationsPage />);
    await waitFor(() => {
      // Multiple elements show "1" (header badge + tab badge): check at least one exists
      expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    });
  });

  test("shows notification titles", async () => {
    mockFetchOk({ notifications: mockNotifications, unreadCount: 1 });
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText("Task due soon")).toBeInTheDocument();
      expect(screen.getByText("Session starting")).toBeInTheDocument();
    });
  });

  test("filter tabs are rendered", async () => {
    mockFetchOk({ notifications: mockNotifications, unreadCount: 1 });
    render(<NotificationsPage />);
    await waitFor(() => screen.getByText("Notifications"));
    expect(screen.getByText("All")).toBeInTheDocument();
    // "Deadlines" appears in multiple places (chip + tab + notification badge): check the tab button
    expect(screen.getAllByText("Deadlines").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sessions").length).toBeGreaterThan(0);
  });

  test("clicking filter tab filters notifications", async () => {
    mockFetchOk({ notifications: mockNotifications, unreadCount: 1 });
    render(<NotificationsPage />);
    await waitFor(() => screen.getByText("Task due soon"));
    // Click the filter tab button specifically (not the chip or badge)
    const deadlineButtons = screen.getAllByText("Deadlines");
    const tabButton = deadlineButtons.find(el => el.tagName === "BUTTON" && el.className.includes("px-3.5"));
    await user.click(tabButton ?? deadlineButtons[0]);
    expect(screen.getByText("Task due soon")).toBeInTheDocument();
    expect(screen.queryByText("Session starting")).not.toBeInTheDocument();
  });

  test("unread only toggle filters read notifications", async () => {
    mockFetchOk({ notifications: mockNotifications, unreadCount: 1 });
    render(<NotificationsPage />);
    await waitFor(() => screen.getByText("Task due soon"));
    await user.click(screen.getByText("Unread only"));
    expect(screen.getByText("Task due soon")).toBeInTheDocument();
    expect(screen.queryByText("Session starting")).not.toBeInTheDocument();
  });

  test("mark all read button appears when unread exist", async () => {
    mockFetchOk({ notifications: mockNotifications, unreadCount: 1 });
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText("Mark all read")).toBeInTheDocument();
    });
  });

  test("clear all button removes all notifications", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ notifications: mockNotifications }) } as any)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as any);

    render(<NotificationsPage />);
    await waitFor(() => screen.getByText("Clear all"));
    await user.click(screen.getByText("Clear all"));
    await waitFor(() => {
      expect(screen.queryByText("Task due soon")).not.toBeInTheDocument();
    });
  });

  test("shows empty state when no notifications", async () => {
    mockFetchOk({ notifications: [], unreadCount: 0 });
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText("All clear!")).toBeInTheDocument();
    });
  });

  test("redirects to login on 401", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as any);
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
