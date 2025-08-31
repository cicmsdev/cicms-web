export type Claim = {
  id: string;
  projectName: string;
  status: "Submitted" | "In Review" | "Approved" | "Rejected";
  incidentDate: string;
  documents: string[]; 
  timeline: {
    step: string;
    date: string;
    completed: boolean;
  }[];
};

export type Filters = {
  status: string[];
  project: string;
  fromDate: string;
  toDate: string;
};
