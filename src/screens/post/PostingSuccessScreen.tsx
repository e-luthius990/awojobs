import React, { useEffect, useState } from "react";
import { supabase } from "../../core/supabase";
import { PostingSuccessPrompt } from "../../ui/components/PostingSuccessPrompt";
import type { Job } from "../../jobs/jobs.types";

type Props = {
  route: {
    params?: {
      jobId?: string;
    };
  };
  navigation: any;
};

export default function PostingSuccessScreen({ route, navigation }: Props) {
  const jobId = route?.params?.jobId;
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    let active = true;

    const loadJob = async () => {
      if (!jobId) {
        navigation.popToTop();
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (!active) return;

      if (error || !data) {
        navigation.popToTop();
        return;
      }

      setJob(data as Job);
    };

    void loadJob();

    return () => {
      active = false;
    };
  }, [jobId, navigation]);

  if (!job) return null;

  return (
    <PostingSuccessPrompt job={job} onDone={() => navigation.popToTop()} />
  );
}
