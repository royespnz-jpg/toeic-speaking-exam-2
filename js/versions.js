// What each version of the exam asks. Every version has the same three parts,
// in the format of Questions 7–11 of the former TOEIC® Speaking test:
//
//   info      – a schedule to read, the caller's opening line and three
//               questions about it (Questions 7, 8 and 9)
//   solution  – who the student answers as, and a voice message with a
//               problem (Question 10)
//   opinion   – three topics (Question 11; the classroom adaptation of the
//               teacher's practice sheet, which has three topics instead of one)
//
// This is original classroom material: none of it comes from the teacher's
// practice sheet (Practices A and B) or from an official test.
//
// To add a version, add another object with the next number: the page, the
// teacher's links and the «Exam» tab of the sheet (npm run gs) follow it.

export const VERSIONS = [
  {
    n: 1,
    info: {
      title: 'Small Business Marketing Workshop',
      columns: ['Time', 'Activity'],
      rows: [
        ['8:00 a.m.', 'Check-in'],
        ['8:30 a.m.', 'Opening Talk: Marketing on a Small Budget'],
        ['9:45 a.m.', 'Creating Content for Social Media'],
        ['11:00 a.m.', 'Taking Better Product Photos'],
        ['12:15 p.m.', 'Lunch Break'],
        ['1:15 p.m.', 'Building a Simple Online Store'],
        ['2:45 p.m.', 'Responding to Customer Reviews'],
        ['4:00 p.m.', 'Certificates and Closing'],
      ],
      details: [
        ['Location', 'Harbor View Hotel, Conference Room B'],
        ['Date', 'March 14'],
        ['Registration fee', '$60 ($45 for students)'],
        ['Register by', 'March 7'],
      ],
      narrator: 'Hi. A friend told me about the Small Business Marketing Workshop, and I am calling to get some details.',
      questions: [
        'What is the date of the workshop, and what time does check-in begin?',
        'I am a university student. How much will I have to pay, and when do I need to register?',
        'I want to learn how to promote my products with social media and photos. Could you tell me about the sessions on those topics?',
      ],
    },
    solution: {
      role: 'Respond as if you work at a car rental agency.',
      message:
        'Hi, this is Karen Mitchell. I reserved a seven-passenger van from your agency for this weekend because my family is driving to my sister’s wedding. ' +
        'When I came to pick it up this morning, your employee told me that only small cars were available. There are seven of us, and we have a lot of luggage. ' +
        'The wedding is tomorrow afternoon, three hours away. Please call me back and tell me how you will solve this problem.',
    },
    opinion: [
      'Some people believe that high schools should teach students how to manage money. Do you agree or disagree?',
      'Some people prefer to work for a large company, while others prefer to work for a small business. Which would you prefer?',
      'Some people believe that people today spend too much time on social media. Do you agree or disagree?',
    ],
  },
  {
    n: 2,
    info: {
      title: 'Public Speaking Seminar',
      columns: ['Time', 'Activity'],
      rows: [
        ['8:45 a.m.', 'Sign-in'],
        ['9:15 a.m.', 'Controlling Your Nerves'],
        ['10:30 a.m.', 'Organizing Your Ideas'],
        ['11:45 a.m.', 'Lunch'],
        ['12:45 p.m.', 'Using Your Voice and Body Language'],
        ['2:00 p.m.', 'Designing Clear Slides'],
        ['3:15 p.m.', 'Practice Presentations in Small Groups'],
        ['4:45 p.m.', 'Feedback and Closing'],
      ],
      details: [
        ['Location', 'Lakeside Community Center, Room 12'],
        ['Date', 'June 6'],
        ['Seminar fee', '$50 ($40 each for groups of three or more)'],
        ['Lunch', 'Not included; there is a café on the first floor'],
      ],
      narrator: 'Hello. I am calling about the Public Speaking Seminar. I have a few questions before I sign up.',
      questions: [
        'Where will the seminar be held, and what time does sign-in begin?',
        'Two of my coworkers want to come with me. How much will each of us pay, and is lunch included?',
        'I get very nervous when I speak in front of people, and I never know how to plan what I am going to say. Which morning sessions would help me with that?',
      ],
    },
    solution: {
      role: 'Respond as if you are the manager of a restaurant.',
      message:
        'Hello, this is Robert Hayes. Two weeks ago, I reserved the private dining room at your restaurant for my parents’ anniversary dinner this Saturday at seven o’clock. ' +
        'I have already invited thirty guests. This morning, one of your employees called to say that the room was booked for another event at the same time by mistake. ' +
        'I cannot change the date because some relatives are flying in for the party. Please call me back and tell me what you can do.',
    },
    opinion: [
      'Some people believe that students learn more by working in groups than by studying alone. Do you agree or disagree?',
      'Some people prefer a job with a high salary and long hours, while others prefer a job with a lower salary and more free time. Which would you choose?',
      'Some people believe that shopping online is better than shopping in stores. Do you agree or disagree?',
    ],
  },
];

export const versionOf = (n) => VERSIONS.find((v) => v.n === Number(n)) || null;

// The version a student gets: the one the teacher's link names (?v=2), or
// else one of them by chance, so that neighbours rarely get the same one.
export function pickVersion(asked, random = Math.random) {
  const fixed = versionOf(asked);
  if (fixed) return fixed.n;
  return VERSIONS[Math.min(VERSIONS.length - 1, Math.floor(random() * VERSIONS.length))].n;
}

// The schedule as one line of text (what the teacher's sheet keeps).
export const infoText = (info) =>
  `${info.title} — ${info.rows.map(([time, what]) => `${time} ${what}`).join(' · ')} — ${info.details.map(([k, v]) => `${k}: ${v}`).join(' · ')}`;
