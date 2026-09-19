require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const connectDB = require('./config/db');

const students = [
  { name: 'Achuta Venkata Ramana',                  rollNumber: '23K61A0601' },
  { name: 'A.Chiru Sri Pranavi',                    rollNumber: '23K61A0602' },
  { name: 'A.Nandini',                              rollNumber: '23K61A0603' },
  { name: 'A.Ram Sai Rohith',                       rollNumber: '23K61A0605' },
  { name: 'Basava Jaya Krishna',                    rollNumber: '23K61A0606' },
  { name: 'Batchu Purna Aishwarya',                 rollNumber: '23K61A0607' },
  { name: 'B.Meghana',                              rollNumber: '23K61A0608' },
  { name: 'B.Nivya',                                rollNumber: '23K61A0609' },
  { name: 'Ch.Yudha',                               rollNumber: '23K61A0610' },
  { name: 'Chintala Siri',                          rollNumber: '23K61A0611' },
  { name: 'Chirla Naga Srilakshmi',                 rollNumber: '23K61A0612' },
  { name: 'Ch.Y.L.V.Ramana Murthi',                rollNumber: '23K61A0613' },
  { name: 'Darsi Raji',                             rollNumber: '23K61A0614' },
  { name: 'E.Teja',                                 rollNumber: '23K61A0615' },
  { name: 'Gadothula Lakshmi Narayana',             rollNumber: '23K61A0616' },
  { name: 'Garikipati Chandu',                      rollNumber: '23K61A0617' },
  { name: 'Geethika Manojna Pallavi N',             rollNumber: '23K61A0618' },
  { name: 'G.Bala Jyothi',                          rollNumber: '23K61A0619' },
  { name: 'G.Viswes Sri Sai Raju',                  rollNumber: '23K61A0620' },
  { name: 'Gollapalli Eswar',                       rollNumber: '23K61A0621' },
  { name: 'Gurajarla Hema Suma',                    rollNumber: '23K61A0622' },
  { name: 'Idarapalli Satya Sreelekha',             rollNumber: '23K61A0623' },
  { name: 'K Chaitanya',                            rollNumber: '23K61A0624' },
  { name: 'K.B.V.S.Vinay',                          rollNumber: '23K61A0625' },
  { name: 'Kanuboyina Thanush',                     rollNumber: '23K61A0626' },
  { name: 'K.Tanuja',                               rollNumber: '23K61A0627' },
  { name: 'K.Yaswanth Chowdary',                    rollNumber: '23K61A0628' },
  { name: 'K.Pranathi',                             rollNumber: '23K61A0629' },
  { name: 'K.Sirisha',                              rollNumber: '23K61A0630' },
  { name: 'K.Sudheendra',                           rollNumber: '23K61A0631' },
  { name: 'K.Aksshaya',                             rollNumber: '23K61A0632' },
  { name: 'K.Vamsi',                                rollNumber: '23K61A0633' },
  { name: 'K.Akhila',                               rollNumber: '23K61A0634' },
  { name: 'L.N.Ramyasree',                          rollNumber: '23K61A0635' },
  { name: 'L.Sai Lakshmi Sri',                      rollNumber: '23K61A0636' },
  { name: 'M.Harini',                               rollNumber: '23K61A0637' },
  { name: 'M.Prasanna Vijaya Lakshmi',              rollNumber: '23K61A0638' },
  { name: 'Mutyala V.B.Siva Pavani',                rollNumber: '23K61A0639' },
  { name: 'Neela Elisharao',                        rollNumber: '23K61A0640' },
  { name: 'Neelam Sujitha',                         rollNumber: '23K61A0641' },
  { name: 'Padilam Ramya',                          rollNumber: '23K61A0642' },
  { name: 'Pallavajjula Ishwarya Lakshmi',          rollNumber: '23K61A0643' },
  { name: 'Palupuri P.S.S.Ganga Bhavani',           rollNumber: '23K61A0644' },
  { name: 'Pandi Pujitha',                          rollNumber: '23K61A0645' },
  { name: 'P.Mahalakshmi',                          rollNumber: '23K61A0646' },
  { name: 'Pindi Naga Nandini',                     rollNumber: '23K61A0648' },
  { name: 'Polumati Ramya',                         rollNumber: '23K61A0649' },
  { name: 'Pujari Swathisree',                      rollNumber: '23K61A0650' },
  { name: 'Sanku Renuka Durga Dhanalakshmi',        rollNumber: '23K61A0652' },
  { name: 'Seepani Hima Bindu',                     rollNumber: '23K61A0653' },
  { name: 'Sahil Shaik',                            rollNumber: '23K61A0654' },
  { name: 'Sohail Shaik',                           rollNumber: '23K61A0655' },
  { name: 'Thanveer Shaik',                         rollNumber: '23K61A0656' },
  { name: 'Sheik Nizam Mohiddin',                   rollNumber: '23K61A0657' },
  { name: 'Singarapu Prasanna Kumar',               rollNumber: '23K61A0658' },
  { name: 'Taneti Balu',                            rollNumber: '23K61A0659' },
  { name: 'Uppalapati Abhinaya',                    rollNumber: '23K61A0660' },
  { name: 'Uppuluri Sowmya',                        rollNumber: '23K61A0661' },
  { name: 'Vaitla Dathri Pallavi',                  rollNumber: '23K61A0662' },
  { name: 'Valluri Shankar Sai Srinivas',           rollNumber: '23K61A0663' },
  { name: 'Vudisi Rama Krishna Sai',                rollNumber: '23K61A0665' },
  { name: 'Yandamuri Akhil Kumar',                  rollNumber: '23K61A0666' },
  // Lateral entry students
  { name: 'Ayinavalli M N S S Chandu',              rollNumber: '24K65A0601' },
  { name: 'K.Soma Sekhar Reddy',                    rollNumber: '24K65A0602' },
  { name: 'N.P.S.V.Satish',                         rollNumber: '24K65A0603' },
  { name: 'Tanuku Pavan Mani Sankar',               rollNumber: '24K65A0604' },
  { name: 'V.K.V.Kumar',                            rollNumber: '24K65A0605' },
  { name: 'V Lokesh Chowdary',                      rollNumber: '24K65A0606' },
].map((s) => ({
  ...s,
  department: 'Computer Science',
  year: 3,
  section: 'A',
}));

const seedStudents = async () => {
  await connectDB();

  let inserted = 0;
  let skipped = 0;

  for (const s of students) {
    const exists = await Student.findOne({ rollNumber: s.rollNumber });
    if (exists) { skipped++; continue; }
    await Student.create(s);
    inserted++;
  }

  console.log(`✅ Done — ${inserted} inserted, ${skipped} already existed.`);
  process.exit(0);
};

seedStudents().catch((err) => { console.error(err); process.exit(1); });
