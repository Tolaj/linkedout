import Dexie from "dexie";

const db = new Dexie("linkedout");

db.version(1).stores({
  applications: "id, company, role, status, dateApplied",
  emails: "id, recipientEmail, company, status, sentAt",
  emailTemplates: "id, name",
  resumesMeta: "id, archetype, version",
  notes: "id, section, title",
  syncQueue: "++id, collection, docId, operation, timestamp",
});

db.version(2).stores({
  applications: "id, company, role, status, dateApplied",
  emails: "id, appId, direction, recipientEmail, company, status, sentAt",
  emailTemplates: "id, name",
  resumesMeta: "id, archetype, version",
  notes: "id, section, title",
  syncQueue: "++id, collection, docId, operation, timestamp",
});

db.version(3).stores({
  applications: "id, workspace, company, role, status, dateApplied",
  emails: "id, appId, direction, recipientEmail, company, status, sentAt",
  emailTemplates: "id, name",
  resumesMeta: "id, workspace, archetype, version",
  notes: "id, section, title",
  syncQueue: "++id, collection, docId, operation, timestamp",
});

export default db;
