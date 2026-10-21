/**
 * Seeds the public portfolio content from Winnie's CV into PostgreSQL.
 *
 *   npm run seed
 *
 * The seed is idempotent and safe to run again:
 *   * a row that already exists is left alone, so anything Winnie has edited
 *     in the admin panel is never overwritten;
 *   * missing rows are inserted;
 *   * no administrator account is created;
 *   * no referee contact details are published.
 *
 * Run `npm run seed` only on a fresh database, or after restoring the CV
 * content on purpose.
 */
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Point it at the PostgreSQL database first.');
  process.exit(1);
}

const NOW = new Date().toISOString();

const biography = [
  'Winnie Awuor Otieno is an accounting, audit and tax professional based in Kisumu, Kenya.',
  'She works as Audit & Consulting Semi Senior at Ronalds LLP, a position she has held since October 2023. Her work covers VAT, PAYE, withholding tax and corporation tax returns for NGOs, SACCOs and corporate clients; financial audits with a tax focus; and the bookkeeping, reconciliations and documentation that keep clients ready for KRA compliance checks.',
  'Before that she spent three years as a Sales Person at Home Living Kisumu, where she was recognised as the most performing Sales Executive in 2021 and 2022. Earlier still she worked in revenue collection and revenue analysis with the County Government of Kisumu.',
  'She holds a Bachelor of Science in Economics and Statistics from Egerton University (Second Class Upper Division) and is working towards the Certified Public Accountant qualification at Advanced level. That qualification is still in progress.',
].join('\n\n');

const heroHeading = ['Clear thinking.', 'Confident decisions.'].join('\n');

const heroSubheading =
  'I work across tax compliance, financial audits and accounting so businesses meet their obligations and understand their finances.';

const experience = [
  {
    position: 'Audit & Consulting Semi Senior',
    organization: 'Ronalds LLP',
    start_date: '2023-10-01',
    end_date: null,
    is_current: true,
    description:
      'Preparing and reviewing VAT, PAYE, withholding tax and corporation tax returns for NGOs, SACCOs and corporate clients; conducting financial audits with a tax focus; supporting KRA compliance checks and the transition to digital tax systems such as iTax.',
    responsibilities: [
      'Prepare and review VAT, PAYE, withholding tax and corporation tax returns',
      'Conduct financial audits with a tax focus; identify tax exposure and recommend corrective measures',
      'Provide bookkeeping and tax advisory services, including tax planning strategies and deadline management',
      'Support clients during KRA compliance checks by preparing documentation and reconciliations',
      'Train clients on tax compliance and assist the transition to digital tax systems (e.g., iTax)',
    ],
    achievements: [],
    display_order: 1,
  },
  {
    position: 'Sales Person',
    organization: 'Home Living Kisumu',
    start_date: '2020-03-01',
    end_date: '2023-09-30',
    is_current: false,
    description:
      'Sales and customer relationship management, business development, social media marketing and website management, budgeting and forecasting.',
    responsibilities: [
      'Manage sales and customer relationships; drive business development and retention',
      'Run social media marketing and manage social pages and website',
      'Analyse performance and guide stock movement decisions',
      'Handle budgeting and forecasting of business-generating activities',
    ],
    achievements: ['Recognised as the most performing Sales Executive in 2021 and 2022'],
    display_order: 2,
  },
  {
    position: 'County Revenue Debt Collection Officer',
    organization: 'Collection Africa Limited (County Government of Kisumu)',
    start_date: '2019-04-01',
    end_date: '2019-09-30',
    is_current: false,
    description:
      'Monitoring outstanding accounts, following up on outstanding payments, negotiating payment plans and handling customer queries.',
    responsibilities: [
      'Monitor outstanding accounts and follow up on outstanding payments',
      'Negotiate payoff deadlines and payment plans',
      'Handle customer queries and complaints',
      'Support working capital improvements through debtor and creditor management',
    ],
    achievements: [],
    display_order: 3,
  },
  {
    position: 'Analyst Intern',
    organization: 'County Government of Kisumu — Revenue Department',
    start_date: '2018-09-01',
    end_date: '2019-04-30',
    is_current: false,
    description:
      'Monitoring agent performance, reconciling payment reports, and performing data entry, verification, correction and review.',
    responsibilities: [
      'Monitor agent performance and advise and motivate agents to hit targets',
      'Reconcile payment reports',
      'Perform data entry, verification, correction and review',
    ],
    achievements: [],
    display_order: 4,
  },
];

const education = [
  {
    institution: 'Egerton University',
    qualification: 'Bachelor of Science in Economics and Statistics',
    field_of_study: 'Economics and Statistics',
    start_date: '2014-01-01',
    end_date: '2018-12-31',
    status: 'completed',
    description: 'Second Class Upper Division.',
    display_order: 1,
  },
  {
    institution: "Kisumu Girls' High School",
    qualification: 'Kenya Certificate of Secondary Education',
    field_of_study: '',
    start_date: '2010-01-01',
    end_date: '2013-12-31',
    status: 'completed',
    description: 'Grade A Minus.',
    display_order: 2,
  },
  {
    institution: 'CPA Kenya (KASNEB)',
    qualification: 'Certified Public Accountant',
    field_of_study: 'Accounting',
    start_date: null,
    end_date: null,
    status: 'ongoing',
    description:
      'Advanced level — ongoing. The qualification is in progress and is not yet complete.',
    display_order: 3,
  },
];

const expertise = [
  {
    title: 'Tax compliance and planning',
    description:
      'VAT, PAYE, withholding tax and corporation tax returns; KRA compliance support; tax planning strategies and deadline management.',
    category: 'Tax',
    display_order: 1,
    is_featured: true,
  },
  {
    title: 'Tax return preparation',
    description:
      'Preparing and reviewing VAT, PAYE, withholding tax and corporation tax returns for NGOs, SACCOs and corporate clients.',
    category: 'Tax',
    display_order: 2,
    is_featured: true,
  },
  {
    title: 'Financial audit and reporting',
    description:
      'Financial audits with a tax focus; identifying tax exposure and recommending corrective measures; preparing supporting documentation and reconciliations.',
    category: 'Audit',
    display_order: 3,
    is_featured: true,
  },
  {
    title: 'Bookkeeping and tax advisory',
    description:
      'Bookkeeping services and tax advisory for clients transitioning to digital tax systems such as iTax.',
    category: 'Advisory',
    display_order: 4,
    is_featured: false,
  },
  {
    title: 'Financial analysis',
    description:
      'Performance analysis, reconciliations and data-driven recommendations that support business decisions.',
    category: 'Analysis',
    display_order: 5,
    is_featured: false,
  },
  {
    title: 'Client advisory and relationship management',
    description:
      'Working with NGOs, SACCOs and corporate clients; handling queries and complaints; building lasting client relationships.',
    category: 'Advisory',
    display_order: 6,
    is_featured: false,
  },
  {
    title: 'Accounting systems',
    description:
      'Xero, QuickBooks Online and Microsoft Excel; supporting clients in the transition to digital tax systems.',
    category: 'Systems',
    display_order: 7,
    is_featured: false,
  },
];

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let inserted = 0;
  let kept = 0;

  try {
    await client.query('BEGIN');

    // --- profile ------------------------------------------------------
    const profile = await client.query(
      'SELECT id FROM profile_settings WHERE id = 1 FOR UPDATE'
    );
    if (profile.rowCount === 0) {
      await client.query(
        `INSERT INTO profile_settings (
           id, display_name, professional_title, biography, location,
           public_email, public_phone, hero_heading, hero_subheading,
           social_links, updated_at
         ) VALUES (1, $2, $3, $4, $5, '', '', $6, $7, '[]'::jsonb, $8)`,
        [
          'Winnie Awuor Otieno',
          'Accounting, Audit & Tax Professional',
          biography,
          'Kisumu, Kenya',
          heroHeading,
          heroSubheading,
          NOW,
        ]
      );
      inserted += 1;
    } else {
      // The profile already exists: leave whatever Winnie has edited in place.
      kept += 1;
    }

    // --- experience ---------------------------------------------------
    for (const item of experience) {
      const existing = await client.query(
        `SELECT id FROM experience
         WHERE organization = $1 AND position = $2 AND start_date = $3`,
        [item.organization, item.position, item.start_date]
      );
      if (existing.rowCount > 0) {
        kept += 1;
        continue;
      }
      await client.query(
        `INSERT INTO experience (
           position, organization, start_date, end_date, is_current, description,
           responsibilities, achievements, display_order, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $10)`,
        [
          item.position,
          item.organization,
          item.start_date,
          item.end_date,
          item.is_current,
          item.description,
          JSON.stringify(item.responsibilities),
          JSON.stringify(item.achievements),
          item.display_order,
          NOW,
        ]
      );
      inserted += 1;
    }

    // --- education ----------------------------------------------------
    for (const item of education) {
      const existing = await client.query(
        `SELECT id FROM education
         WHERE institution = $1 AND qualification = $2 AND status = $3`,
        [item.institution, item.qualification, item.status]
      );
      if (existing.rowCount > 0) {
        kept += 1;
        continue;
      }
      await client.query(
        `INSERT INTO education (
           institution, qualification, field_of_study, start_date, end_date,
           status, description, display_order, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
        [
          item.institution,
          item.qualification,
          item.field_of_study,
          item.start_date,
          item.end_date,
          item.status,
          item.description,
          item.display_order,
          NOW,
        ]
      );
      inserted += 1;
    }

    // --- expertise ----------------------------------------------------
    for (const item of expertise) {
      const existing = await client.query(
        'SELECT id FROM expertise WHERE title = $1 AND category = $2',
        [item.title, item.category]
      );
      if (existing.rowCount > 0) {
        kept += 1;
        continue;
      }
      await client.query(
        `INSERT INTO expertise (
           title, description, category, display_order, is_featured,
           created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $6)`,
        [
          item.title,
          item.description,
          item.category,
          item.display_order,
          item.is_featured,
          NOW,
        ]
      );
      inserted += 1;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  console.log('Seeded public portfolio content from the CV.');
  console.log(`  inserted ${inserted} record(s), kept ${kept} existing record(s) untouched.`);
  console.log('  No administrator account was created and no referee details were published.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
