import type { NavigatorScreenParams } from "@react-navigation/native";
import type { PostJobStackParamList } from "./PostJobNavigator";

/* =====================================================
   ROOT STACK
===================================================== */

export type RootStackParamList = {
  App: undefined;
  AuthModal: undefined;
  ManualLocation: undefined;
  Premium: undefined;
};

/* =====================================================
   GUEST TABS
===================================================== */

export type GuestTabsParamList = {
  Jobs: undefined;
  PostJob: undefined;
};

/* =====================================================
   JOB SEEKER TABS
===================================================== */

export type JobSeekerTabsParamList = {
  Jobs: undefined;
  Saved: undefined;
  Profile: undefined;
};

/* =====================================================
   EMPLOYER TABS
===================================================== */

export type EmployerTabsParamList = {
  Home: undefined;
  MyJobs: undefined;
  Payments: undefined;
  Profile: undefined;
};

/* =====================================================
   EMPLOYER ROOT STACK (STRICT NESTED)
===================================================== */

export type EmployerRootStackParamList = {
  EmployerTabs: undefined;
  ApplicationsInbox: undefined;

  // ✅ FIXED — nested stack typing
  PostJobFlow: NavigatorScreenParams<PostJobStackParamList>;

  JobDetail: {
    jobId: string;
  };
};

/* =====================================================
   MODERATOR TABS
===================================================== */

export type ModeratorTabsParamList = {
  Dashboard: undefined;
  ReportedJobs: undefined;
  Users: undefined;
  Profile: undefined;
};

/* =====================================================
   SUPER ADMIN TABS
===================================================== */

export type SuperAdminTabsParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Payments: undefined;
  Users: undefined;
  Analytics: undefined;
  Profile: undefined;
};