import { useEffect } from "react";

export default function MyJobsRedirect({ navigation }: any) {
  useEffect(() => {
    navigation.replace("MyJobs");
  }, []);

  return null;
}
