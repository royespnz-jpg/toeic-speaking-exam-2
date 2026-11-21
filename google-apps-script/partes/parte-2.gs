/* ── Speaking Exam II · parte 2 de 5 ── */

const EXAM_ROWS_2 = [
  [2,"Information","Public Speaking Seminar"],
  [2,"8:45 a.m.","Sign-in"],
  [2,"9:15 a.m.","Controlling Your Nerves"],
  [2,"10:30 a.m.","Organizing Your Ideas"],
  [2,"11:45 a.m.","Lunch"],
  [2,"12:45 p.m.","Using Your Voice and Body Language"],
  [2,"2:00 p.m.","Designing Clear Slides"],
  [2,"3:15 p.m.","Practice Presentations in Small Groups"],
  [2,"4:45 p.m.","Feedback and Closing"],
  [2,"Location","Lakeside Community Center, Room 12"],
  [2,"Date","June 6"],
  [2,"Seminar fee","$50 ($40 each for groups of three or more)"],
  [2,"Lunch","Not included; there is a café on the first floor"],
  [2,"Caller","Hello. I am calling about the Public Speaking Seminar. I have a few questions before I sign up."],
  [2,"Question 7","Where will the seminar be held, and what time does sign-in begin?"],
  [2,"Question 8","Two of my coworkers want to come with me. How much will each of us pay, and is lunch included?"],
  [2,"Question 9","I get very nervous when I speak in front of people, and I never know how to plan what I am going to say. Which morning sessions would help me with that?"],
];

function examRows_() {
  return [].concat(EXAM_ROWS_1, EXAM_ROWS_2);
}
/* exam:end */

/* The scales of the TOEIC Speaking test: 0–3 for Questions 7–9 and 0–5 for
   Questions 10 and 11. One row per score, one column per kind of question. */
const RUBRIC = [
  [
    '5',
    '—',
    'Shows clearly that the problem is understood and proposes a suitable, well-developed ' +
      'solution, in the role given. Sustained, well organized and easy to understand; good ' +
      'control of grammar and vocabulary.',
    'States a clear opinion and supports it with relevant reasons and examples. Sustained, ' +
      'coherent and easy to understand; good control of grammar and vocabulary.',
  ],
  [
    '4',
    '—',
    'Recognizes the problem and proposes a solution, but with less development or small ' +
      'lapses in organization, grammar or pronunciation. Still easy to follow.',
    'States an opinion and supports it, but with less development or small lapses in ' +
      'organization, grammar or pronunciation. Still easy to follow.',
  ],
  [
    '3',
    'Complete, accurate and appropriate: gives the information the question asks for, taken ' +
      'correctly from the schedule. Easy to understand.',
    'Tries to deal with the problem, but the recognition or the solution is limited or vague. ' +
      'Pauses or errors sometimes make the meaning unclear.',
    'States an opinion, but the support is limited, vague or repetitive. Pauses or errors ' +
      'sometimes make the meaning unclear.',
  ],
  [
    '2',
    'Connected to the question, but incomplete or partly inaccurate; or it takes some effort ' +
      'to understand.',
    'Mentions the problem or a solution only minimally. Limited language; often hard to follow.',
    'Gives an opinion with little or no support. Limited language; often hard to follow.',
  ],
  [
    '1',
    'Does not answer the question effectively: the information is wrong or mostly missing, ' +
      'or it is hard to understand.',
    'Isolated words or phrases; does not deal with the task.',
    'Isolated words or phrases; no clear opinion.',
  ],
  [
    '0',
    'No answer, no English, or an answer that is not connected to the question.',
    'No answer, no English, or an answer that is not connected to the message.',
    'No answer, no English, or an answer that is not connected to the topic.',
  ],
];

/* ── fin de la parte 2 de 5 ── */
