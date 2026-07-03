import type { Profession } from '../types/game';

export const PROFESSIONS: Profession[] = [
  {
    id: 'engineer',
    name: '工程师',
    salary: 7500,
    cash: 1000,
    expenses: {
      tax: 1500,
      mortgage: 2000,
      studentLoan: 0,
      carLoan: 400,
      creditCard: 300,
      other: 1000,
      perChild: 300,
    },
    liabilities: [
      { name: '房屋贷款', principal: 40000, monthlyPayment: 2000, interestRate: 0.06 },
      { name: '汽车贷款', principal: 5000, monthlyPayment: 400, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 2000, monthlyPayment: 300, interestRate: 0.18 },
    ],
    description: '收入稳定，支出适中，是新手入门的理想职业。',
  },
  {
    id: 'teacher',
    name: '教师',
    salary: 3500,
    cash: 550,
    expenses: {
      tax: 800,
      mortgage: 1000,
      studentLoan: 0,
      carLoan: 0,
      creditCard: 100,
      other: 200,
      perChild: 150,
    },
    liabilities: [
      { name: '房屋贷款', principal: 15000, monthlyPayment: 1000, interestRate: 0.06 },
      { name: '信用卡欠款', principal: 500, monthlyPayment: 100, interestRate: 0.18 },
    ],
    description: '收入较低但支出也低，容易实现财务自由。',
  },
  {
    id: 'doctor',
    name: '医生',
    salary: 13000,
    cash: 1500,
    expenses: {
      tax: 3000,
      mortgage: 5000,
      studentLoan: 800,
      carLoan: 800,
      creditCard: 500,
      other: 1600,
      perChild: 600,
    },
    liabilities: [
      { name: '房屋贷款', principal: 75000, monthlyPayment: 5000, interestRate: 0.06 },
      { name: '助学贷款', principal: 12000, monthlyPayment: 800, interestRate: 0.05 },
      { name: '汽车贷款', principal: 15000, monthlyPayment: 800, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 5000, monthlyPayment: 500, interestRate: 0.18 },
    ],
    description: '高收入高支出，虽然现金流充裕，但要突破需要更大规模的资产。',
  },
  {
    id: 'driver',
    name: '司机',
    salary: 2500,
    cash: 400,
    expenses: {
      tax: 500,
      mortgage: 600,
      studentLoan: 0,
      carLoan: 300,
      creditCard: 100,
      other: 100,
      perChild: 100,
    },
    liabilities: [
      { name: '房屋贷款', principal: 9000, monthlyPayment: 600, interestRate: 0.06 },
      { name: '汽车贷款', principal: 3000, monthlyPayment: 300, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 500, monthlyPayment: 100, interestRate: 0.18 },
    ],
    description: '起点最低，但压力也最小，每一笔小生意都可能改变命运。',
  },
  {
    id: 'secretary',
    name: '秘书',
    salary: 2800,
    cash: 500,
    expenses: {
      tax: 600,
      mortgage: 700,
      studentLoan: 0,
      carLoan: 300,
      creditCard: 100,
      other: 100,
      perChild: 120,
    },
    liabilities: [
      { name: '房屋贷款', principal: 10000, monthlyPayment: 700, interestRate: 0.06 },
      { name: '汽车贷款', principal: 3000, monthlyPayment: 300, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 500, monthlyPayment: 100, interestRate: 0.18 },
    ],
    description: '收支平衡，需要通过精明的小投资来逐步突破。',
  },
  {
    id: 'security',
    name: '保安',
    salary: 2000,
    cash: 350,
    expenses: {
      tax: 400,
      mortgage: 500,
      studentLoan: 0,
      carLoan: 200,
      creditCard: 50,
      other: 150,
      perChild: 80,
    },
    liabilities: [
      { name: '房屋贷款', principal: 7000, monthlyPayment: 500, interestRate: 0.06 },
      { name: '汽车贷款', principal: 2000, monthlyPayment: 200, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 300, monthlyPayment: 50, interestRate: 0.18 },
    ],
    description: '现金流微薄，每一次额外支出都可能是致命的。',
  },
  {
    id: 'lawyer',
    name: '律师',
    salary: 10000,
    cash: 1200,
    expenses: {
      tax: 2500,
      mortgage: 3000,
      studentLoan: 500,
      carLoan: 600,
      creditCard: 400,
      other: 1000,
      perChild: 450,
    },
    liabilities: [
      { name: '房屋贷款', principal: 55000, monthlyPayment: 3000, interestRate: 0.06 },
      { name: '助学贷款', principal: 10000, monthlyPayment: 500, interestRate: 0.05 },
      { name: '汽车贷款', principal: 10000, monthlyPayment: 600, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 4000, monthlyPayment: 400, interestRate: 0.18 },
    ],
    description: '高收入群体，但高支出也使其财务自由门槛较高。',
  },
  {
    id: 'pilot',
    name: '飞行员',
    salary: 6000,
    cash: 800,
    expenses: {
      tax: 1500,
      mortgage: 1500,
      studentLoan: 0,
      carLoan: 500,
      creditCard: 300,
      other: 300,
      perChild: 250,
    },
    liabilities: [
      { name: '房屋贷款', principal: 30000, monthlyPayment: 1500, interestRate: 0.06 },
      { name: '汽车贷款', principal: 7000, monthlyPayment: 500, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 2000, monthlyPayment: 300, interestRate: 0.18 },
    ],
    description: '收入不错，支出可控，是比较均衡的职业。',
  },
];

export const PLAYER_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
];
