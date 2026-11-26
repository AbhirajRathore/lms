/**
 * Development seed: the dev sign-in users, three published courses and one draft.
 * Run with `npm run db:seed -w @lms/api`. Safe to re-run: rows are matched by natural keys
 * (user externalId; course title + creator; lesson title within its course) and updated in place.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type LessonType, type Role } from '../src/generated/prisma/client.js';
import { loadEnv } from '../src/config/env.js';

interface SeedUser {
  email: string;
  roles: Role[];
}

interface SeedLesson {
  title: string;
  type: LessonType;
  body: string;
  url?: string;
  durationMinutes: number;
}

interface SeedCourse {
  title: string;
  description: string;
  owner: string;
  published: boolean;
  lessons: SeedLesson[];
}

/** Keep in step with apps/web/src/api/dev-auth.ts (dev tokens map to externalId "dev-<email>"). */
const USERS: SeedUser[] = [
  { email: 'admin@lms.local', roles: ['admin'] },
  { email: 'instructor@lms.local', roles: ['instructor'] },
  { email: 'instructor2@lms.local', roles: ['instructor'] },
  { email: 'learner@lms.local', roles: ['learner'] },
];

const text = (...paragraphs: string[]) => paragraphs.join('\n\n');

const COURSES: SeedCourse[] = [
  {
    title: 'Information Security Essentials',
    description:
      'Everyday habits that protect you, your colleagues and our customers: spotting phishing, signing in safely, handling information with care and reporting incidents quickly.',
    owner: 'instructor@lms.local',
    published: true,
    lessons: [
      {
        title: "Why security is everyone's job",
        type: 'text',
        durationMinutes: 8,
        body: text(
          'Most security incidents do not start with a clever technical attack. They start with an ordinary moment: a convincing email, a reused password, a laptop left unlocked in a café, or a spreadsheet sent to the wrong person. Attackers know that people are busy and helpful, and they design their approaches around that.',
          'That is why security is part of every role, not just the IT team. Firewalls and antivirus software stop a lot, but they cannot tell whether a payment request from "the finance director" is genuine, or whether a file should really be shared outside the company. You can.',
          'Throughout this course, keep three questions in mind:\n- Is this request expected, and does it come from who it claims to?\n- Does this information need protecting, and who is allowed to see it?\n- If something looks wrong, who do I tell?',
          'You are not expected to be a security expert. You are expected to pause when something feels off, follow the basics covered here, and report concerns early. Reporting a mistake quickly is always better than hiding it: the sooner the security team knows, the less damage an incident can do.',
        ),
      },
      {
        title: 'Spotting phishing and social engineering',
        type: 'text',
        durationMinutes: 12,
        body: text(
          'Phishing is an attempt to trick you into clicking a link, opening an attachment, sharing your password or sending money. It usually arrives by email, but the same tricks are used in text messages, chat apps and phone calls.',
          'Common warning signs:\n- Urgency or pressure: "Your account will be closed in one hour", "The CEO needs this transfer before the board meeting".\n- A sender address that is close to, but not exactly, a real one (for example a letter swapped or an extra word in the domain).\n- Links whose real destination does not match the text. Hover over a link (or long-press on mobile) to see where it goes before you click.\n- Unexpected attachments, especially archives, macros or "invoices" you were not expecting.\n- Requests to bypass the normal process: change bank details, buy gift cards, keep something confidential from your manager.',
          'Social engineering also happens in person and by phone. Someone may follow you through a secure door, claim to be from IT support and ask for your password, or call pretending to be a supplier. Genuine IT staff will never ask for your password.',
          'What to do: do not click, reply or forward the message to colleagues. Verify the request using contact details you already trust, such as the company directory or a phone number you have used before, never the details in the suspicious message itself. Then report it using the "Report phishing" button or the security team mailbox. If you already clicked or entered your password, report it straight away and change your password; acting fast matters more than anything else.',
        ),
      },
      {
        title: 'Passwords, passphrases and multi-factor authentication',
        type: 'text',
        durationMinutes: 10,
        body: text(
          'Stolen and reused passwords are one of the most common ways attackers get in. When one website is breached, criminals automatically try the same email and password on hundreds of other services. A unique password for every account stops that from spreading.',
          'Good practice:\n- Use a long passphrase rather than a short complex password. Four or more unrelated words (for example "copper lantern river biscuit") are easier to remember and harder to guess than "P@ssw0rd1".\n- Never reuse your work password anywhere else.\n- Use the company-approved password manager to create and store unique passwords. You only need to remember one strong passphrase.\n- Do not write passwords on notes, share them with colleagues or send them by email or chat, even to IT.',
          'Multi-factor authentication (MFA) adds a second check, such as an authenticator app prompt or a security key, on top of your password. Even if your password is stolen, MFA stops most account takeovers. Turn it on wherever it is offered, and treat unexpected MFA prompts as a warning: if you did not just try to sign in, deny the prompt and report it, because someone else may have your password.',
          'If you think a password has been exposed, change it immediately and let the security team know so they can check for unusual activity.',
        ),
      },
      {
        title: 'Handling information and reporting incidents',
        type: 'text',
        durationMinutes: 10,
        body: text(
          'Not all information needs the same protection. Most organisations use a few classification levels, such as Public, Internal, Confidential and Restricted. The label tells you who may see the information and how it may be shared. Customer personal data, salary details, contracts and security information are usually Confidential or higher.',
          'Everyday rules of thumb:\n- Share on a need-to-know basis, using approved company tools. Avoid personal email, personal cloud storage and USB sticks for work files.\n- Check the recipient list before you press send, especially when autocomplete fills in an address.\n- Lock your screen whenever you step away (Windows key + L, or Ctrl + Cmd + Q on a Mac).\n- Keep printed documents out of sight and use confidential waste bins.\n- Be careful what you discuss in public places and on video calls in shared spaces.',
          'A security incident is anything that could put information or systems at risk: a lost or stolen device, an email sent to the wrong person, a suspicious login prompt, malware warnings, or noticing that someone has access they should not have.',
          'Report incidents immediately through the IT service desk or the security team, even if you are not sure it is serious and even if it was your own mistake. Describe what happened, when, and what information or systems may be affected. Do not try to investigate or clean up on your own, and do not delete evidence such as the suspicious email. Fast, honest reporting is what keeps a small problem from becoming a serious breach.',
        ),
      },
      {
        title: 'Further reading: top tips for staying secure online',
        type: 'document',
        url: 'https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online',
        durationMinutes: 15,
        body: text(
          'Optional reading from the UK National Cyber Security Centre: short, practical guidance that applies at work and at home.',
          'Focus on the sections on strong passwords, two-step verification, keeping devices updated and backing up your data. They reinforce the habits from the earlier lessons in this course.',
        ),
      },
    ],
  },
  {
    title: 'Workplace Health and Safety',
    description:
      'The essentials for staying safe at work: your responsibilities, spotting hazards, setting up a healthy workstation, fire and emergency procedures, and reporting accidents and near misses.',
    owner: 'instructor2@lms.local',
    published: true,
    lessons: [
      {
        title: 'Your health and safety responsibilities',
        type: 'text',
        durationMinutes: 8,
        body: text(
          'Health and safety is a shared responsibility. The organisation must provide a safe workplace, safe equipment, suitable training and clear procedures. Managers must make sure those procedures are followed in their teams. And every employee, contractor and visitor must take reasonable care of their own safety and the safety of others affected by what they do.',
          'In practice, your responsibilities are to:\n- Follow the safety instructions, signs and training you have been given.\n- Use equipment and protective clothing as intended, and never remove or bypass guards or safety devices.\n- Report hazards, faulty equipment, accidents and near misses promptly.\n- Not start a task you have not been trained for, or that you believe is unsafe. Stop and ask.',
          'Local laws differ in detail, but the principle is the same everywhere: if you see something unsafe, you have the right and the responsibility to raise it. Nobody will be penalised for raising a genuine safety concern in good faith.',
          'Find out who your site first aiders, fire wardens and health and safety contacts are. Their names are usually on the notice board or the intranet. Knowing who to call saves time when it matters.',
        ),
      },
      {
        title: 'Spotting hazards and assessing risk',
        type: 'text',
        durationMinutes: 12,
        body: text(
          'A hazard is anything with the potential to cause harm: a trailing cable, a wet floor, a heavy box, a chemical, a blocked fire exit or a stressful workload. Risk is the combination of how likely the harm is and how serious it would be.',
          'A simple risk assessment follows five steps:\n1. Identify the hazards: walk around, look at the task, ask the people who do it.\n2. Decide who might be harmed and how, including visitors, cleaners, new starters and anyone more vulnerable.\n3. Evaluate the risk and decide on controls.\n4. Record what you found and what you are doing about it.\n5. Review the assessment when something changes, or at least once a year.',
          'When choosing controls, work down the hierarchy: remove the hazard altogether if you can; otherwise substitute something less dangerous; then use engineering controls such as guards or ventilation; then administrative controls such as procedures, training and signs; and finally personal protective equipment. Protective equipment is the last line of defence, not the first.',
          'The most common workplace injuries are slips, trips and falls, and injuries from lifting and carrying. Keep walkways clear, clean up or sign spills straight away, and plan lifts: test the weight, keep the load close to your body, bend your knees rather than your back, and get help or use a trolley for anything heavy or awkward.',
        ),
      },
      {
        title: 'Setting up a healthy workstation',
        type: 'text',
        durationMinutes: 10,
        body: text(
          'Many of us spend most of the day at a screen, at the office or at home. Poor posture and long periods without moving can lead to back, neck and shoulder pain, eye strain and repetitive strain injuries. A few adjustments make a big difference.',
          "Checklist for your workstation:\n- Chair: adjust the height so your feet are flat on the floor (or on a footrest) and your thighs are roughly horizontal. Use the lumbar support to keep the curve in your lower back.\n- Screen: place it about an arm's length away, with the top of the screen at or slightly below eye level. If you use a laptop for long periods, raise it on a stand and use a separate keyboard and mouse.\n- Keyboard and mouse: keep them close, with your elbows by your sides and your wrists straight.\n- Lighting: avoid glare and reflections on the screen; position it at a right angle to windows where possible.",
          'Movement matters as much as set-up. Change position often, stand up and move around at least once an hour, and give your eyes a break by looking at something in the distance for a few seconds every 20 minutes or so.',
          'If you have discomfort that does not go away, or need equipment such as a different chair or keyboard, talk to your manager or the health and safety team. Ask for a workstation assessment if you have not had one, including for your home working set-up.',
        ),
      },
      {
        title: 'Fire safety and emergency procedures',
        type: 'text',
        durationMinutes: 10,
        body: text(
          'Fire safety is mostly about prevention and preparation. Keep fire doors closed and never wedge them open. Keep exits, corridors and stairways clear. Do not overload sockets or daisy-chain extension leads, and report damaged cables, scorch marks or burning smells. Store flammable materials away from heat sources.',
          'Know before you need it:\n- At least two escape routes from where you usually work.\n- Where the nearest fire alarm call points and extinguishers are.\n- Where your assembly point is.\n- Who your fire wardens are.',
          'If you discover a fire: raise the alarm by operating the nearest call point, leave the building by the nearest safe exit, and call the emergency services if that is your site procedure. Only tackle a very small fire if you have been trained, it is safe to do so and you have a clear escape route behind you.',
          'When the alarm sounds: stop what you are doing and leave immediately by the nearest exit. Do not stop to collect belongings and do not use lifts. Close doors behind you if you can. Go to the assembly point and stay there so that wardens can account for everyone. Never re-enter the building until you are told it is safe. If you have a condition that would make evacuation difficult, ask for a personal emergency evacuation plan.',
        ),
      },
      {
        title: 'Reporting accidents and near misses',
        type: 'text',
        durationMinutes: 6,
        body: text(
          'Every accident and near miss should be reported, however minor it seems. A near miss is an event that could have caused harm but did not, for example a box falling from a shelf just after someone walked past. Near misses are free lessons: fixing their cause prevents the next one from becoming an injury.',
          'If someone is hurt, make the area safe, call a first aider or the emergency services as needed, and do not move a seriously injured person unless they are in immediate danger.',
          'Then report the event using the incident reporting system or your manager as soon as possible, and on the same day. Include what happened, where and when, who was involved, any injuries, and anything that contributed, such as poor lighting or missing equipment. Some serious injuries and dangerous occurrences must be reported to the authorities within a set time, so prompt internal reporting matters.',
          'Reports are used to find and fix causes, not to blame individuals. Honest reporting helps keep everyone safe.',
        ),
      },
    ],
  },
  {
    title: 'Cyber Safety in Five Short Videos',
    description:
      'Five one-minute videos from CISA, the US Cybersecurity and Infrastructure Security Agency, on the habits that stop most attacks: strong passwords, multi-factor authentication, spotting phishing and keeping software up to date.',
    owner: 'instructor2@lms.local',
    published: true,
    lessons: [
      {
        title: 'Four simple steps to stay safe online',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=LO4IZBf5gC4',
        durationMinutes: 2,
        body: text(
          'An overview of the four habits this course covers. Each one takes a few minutes to set up and blocks a large share of everyday attacks.',
          'Key points:\n- Use long, unique passwords and a password manager.\n- Turn on multi-factor authentication (MFA).\n- Recognise and report phishing.\n- Keep your software updated.',
        ),
      },
      {
        title: 'Make strong passwords',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=XXrbut5xRbE',
        durationMinutes: 2,
        body: text(
          'Key points:\n- Long beats complicated: aim for at least 16 characters, for example a few random words.\n- Use a different password for every account, so one leak does not unlock the rest.\n- Let a password manager create and remember them for you.',
          'At work, never share your password with anyone, including colleagues or someone claiming to be from IT.',
        ),
      },
      {
        title: 'Turn on multi-factor authentication',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=QWwaidg3AtY',
        durationMinutes: 2,
        body: text(
          'Key points:\n- MFA asks for a second proof that it is really you, such as a code or an app approval.\n- Even if someone steals your password, they still cannot sign in.\n- Turn it on for email, banking and social media first.',
          'If you get an MFA prompt you did not ask for, do not approve it. Report it to the IT service desk straight away: it usually means someone has your password.',
        ),
      },
      {
        title: 'Recognise and report phishing',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=sg0kQYvTlnc',
        durationMinutes: 2,
        body: text(
          'Key points:\n- Be suspicious of urgent requests, unexpected attachments and links that ask you to sign in.\n- Check the sender address and hover over links before you click.\n- When in doubt, contact the sender another way you already trust.',
          'Report suspicious messages using the company reporting process rather than just deleting them. One report can protect everyone who received the same email.',
        ),
      },
      {
        title: 'Keep your software up to date',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=zCcX6aSXcLI',
        durationMinutes: 2,
        body: text(
          'Key points:\n- Updates fix security holes that attackers already know about.\n- Turn on automatic updates for your devices and apps.\n- Restart when asked: many updates only take effect after a restart.',
          'On company devices, updates are usually managed for you. Do not postpone them for days, and tell the IT service desk if a device has stopped updating.',
        ),
      },
    ],
  },
  {
    title: 'Data Privacy Fundamentals',
    description:
      'How to recognise personal data and handle it lawfully, fairly and securely in everyday work.',
    owner: 'instructor@lms.local',
    published: false,
    lessons: [
      {
        title: 'What counts as personal data',
        type: 'text',
        durationMinutes: 8,
        body: text(
          'Personal data is any information that relates to an identified or identifiable living person. Names, email addresses, phone numbers and ID numbers are obvious examples, but so are less obvious ones: an employee number, a device identifier, a photo, a voice recording, location data, or a combination of details that together point to one person.',
          'Some categories are especially sensitive and need extra care, such as health information, biometric data, religious or political beliefs, and information about criminal records. Access to this kind of data should be tightly limited.',
          'Data protection laws in many countries share the same core principles: collect personal data only for a clear purpose, use it only for that purpose, keep only what you need, keep it accurate, keep it no longer than necessary, and protect it properly.',
        ),
      },
      {
        title: 'Collecting and keeping only what you need',
        type: 'text',
        durationMinutes: 8,
        body: text(
          'Before collecting personal data, ask: why do we need this, and could we do the job with less? Every extra field on a form or extra copy of a spreadsheet is something that has to be protected, kept up to date and eventually deleted.',
          'Practical habits:\n- Do not copy personal data into personal folders, email threads or chat messages "just in case".\n- Use shared, access-controlled systems instead of local spreadsheets.\n- Delete or anonymise data when the retention period ends, following the company retention schedule.\n- If someone asks to see, correct or delete their data, pass the request to the privacy team promptly. These requests often have legal deadlines.',
        ),
      },
    ],
  },
];

async function seedCourse(prisma: PrismaClient, seed: SeedCourse, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.course.findFirst({
      where: { title: seed.title, createdById },
      orderBy: { createdAt: 'asc' },
    });
    const data = {
      title: seed.title,
      description: seed.description,
      published: seed.published,
      publishedAt: seed.published ? (existing?.publishedAt ?? new Date()) : null,
    };
    const course = existing
      ? await tx.course.update({ where: { id: existing.id }, data })
      : await tx.course.create({ data: { ...data, createdById } });

    const current = await tx.lesson.findMany({
      where: { courseId: course.id },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    const byTitle = new Map(current.map((lesson) => [lesson.title, lesson]));
    const seededIds = new Set<string>();
    for (const [position, lesson] of seed.lessons.entries()) {
      const lessonData = {
        title: lesson.title,
        type: lesson.type,
        body: lesson.body,
        url: lesson.url ?? null,
        durationMinutes: lesson.durationMinutes,
        position,
      };
      const found = byTitle.get(lesson.title);
      const saved = found
        ? await tx.lesson.update({ where: { id: found.id }, data: lessonData })
        : await tx.lesson.create({ data: { ...lessonData, courseId: course.id } });
      seededIds.add(saved.id);
    }

    // Lessons added by hand keep their relative order, after the seeded ones (positions stay 0..n-1).
    const extras = current.filter((lesson) => !seededIds.has(lesson.id));
    for (const [i, lesson] of extras.entries()) {
      const position = seed.lessons.length + i;
      if (lesson.position !== position) {
        await tx.lesson.update({ where: { id: lesson.id }, data: { position } });
      }
    }
    return { course, created: !existing };
  });
}

async function main(): Promise<void> {
  const env = loadEnv();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  try {
    const userIds = new Map<string, string>();
    for (const { email, roles } of USERS) {
      const externalId = `dev-${email}`;
      const user = await prisma.user.upsert({
        where: { externalId },
        create: { externalId, email, roles },
        update: { email, roles },
      });
      userIds.set(email, user.id);
    }
    console.log(`Users: ${USERS.map((user) => user.email).join(', ')}`);

    for (const seed of COURSES) {
      const ownerId = userIds.get(seed.owner);
      if (!ownerId) throw new Error(`Seed course "${seed.title}" has unknown owner ${seed.owner}`);
      const { course, created } = await seedCourse(prisma, seed, ownerId);
      console.log(
        `${created ? 'Created' : 'Updated'} ${seed.published ? 'published' : 'draft'} course "${course.title}" (${seed.lessons.length} lessons)`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
