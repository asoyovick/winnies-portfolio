/**
 * Seeds public portfolio content from Winnie Awuor Otieno's CV.
 *
 * This seeds ONLY public content (profile, experience, education, expertise,
 * tools). It deliberately does NOT create an administrator account — that is
 * done separately through the setup process.
 *
 * Usage: node scripts/seed.js
 *        DATABASE_URL=path/to/db.sqlite node scripts/seed.js
 *
 * Safe to re-run: it updates existing rows by unique keys and never duplicates.
 */
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DB_PATH = process.env.DATABASE_URL || join(PROJECT_ROOT, 'data', 'app.db');

const NOW = new Date().toISOString();

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const tx = db.transaction(() => {
  // ---- Profile (singleton) ----
  db.prepare(`
    UPDATE profile_settings SET
      display_name = 'Winnie Awuor Otieno',
      professional_title = 'Accounting, Audit & Tax Professional',
      location = 'Kisumu, Kenya',
      biography = '',
      updated_at = ?
    WHERE id = 1
  `).run(NOW);

  const bio = [
    'Winnie Awuor Otieno is an accounting, audit and tax professional based in Kisumu, Kenya.',
    'She works as Audit & Consulting Semi Senior at Ronalds LLP, a position she has held since October 2023. Her work covers VAT, PAYE, withholding tax and corporation tax returns for NGOs, SACCOs and corporate clients; financial audits with a tax focus; and the bookkeeping, reconciliations and documentation that keep clients ready for KRA compliance checks.',
    'Before that she spent three years as a Sales Person at Home Living Kisumu, where she was recognised as the most performing Sales Executive in 2021 and 2022. Earlier still she worked in revenue collection and revenue analysis with the County Government of Kisumu.',
    'She holds a Bachelor of Science in Economics and Statistics from Egerton University (Second Class Upper Division) and is working towards the Certified Public Accountant qualification at Advanced level. That qualification is still in progress.',
  ].join('\n\n');

  db.prepare(`
    UPDATE profile_settings SET biography = ?, updated_at = ? WHERE id = 1
  `).run(bio, NOW);

  const heroHeading = ['Clear thinking.', 'Confident decisions.'].join('\n');

  const heroSubheading = [
    'I work across tax compliance, financial audits and accounting so businesses meet their obligations and understand their finances.',
  ].join(' ');

  db.prepare(`
    UPDATE profile_settings SET hero_heading = ?, hero_subheading = ?, updated_at = ? WHERE id = 1
  `).run(heroHeading, heroSubheading, NOW);

  // ---- Experience (reverse chronological, newest first => lowest display_order) ----
  const experience = [
    {
      position: 'Audit & Consulting Semi Senior',
      organization: 'Ronalds LLP',
      start_date: '2023-10-01',
      end_date: null,
      is_current: 1,
      description:
        'Preparing and reviewing VAT, PAYE, withholding tax and corporation tax returns for NGOs, SACCOs and corporate clients; conducting financial audits with a tax focus; supporting KRA compliance checks and the transition to digital tax systems such as iTax.',
      responsibilities: [
        'Prepare and review VAT, PAYE, withholding tax and corporation tax returns',
        'Conduct financial audits with a tax focus; identify tax exposure and recommend corrective measures',
        'Provide bookkeeping and tax advisory services, including tax planning strategies and deadline management',
        'Support clients during KRA compliance checks by preparing documentation and reconciliations',
        'Train clients on tax compliance and assist the transition to digital tax systems (e.g., iTax)',
      ],
      display_order: 1,
    },
    {
      position: 'Sales Person',
      organization: 'Home Living Kisumu',
      start_date: '2020-03-01',
      end_date: '2023-09-30',
      is_current: 0,
      description:
        'Sales and customer relationship management, business development, social media marketing and website management, budgeting and forecasting.',
      responsibilities: [
        'Manage sales and customer relationships; drive business development and retention',
        'Run social media marketing and manage social pages and website',
        'Analyse performance and guide stock movement decisions',
        'Handle budgeting and forecasting of business-generating activities',
      ],
      achievements: [
        'Recognised as the most performing Sales Executive in 2021 and 2022',
      ],
      display_order: 2,
    },
    {
      position: 'County Revenue Debt Collection Officer',
      organization: 'Collection Africa Limited (County Government of Kisumu)',
      start_date: '2019-04-01',
      end_date: '2019-09-30',
      is_current: 0,
      description:
        'Monitoring outstanding accounts, following up on outstanding payments, negotiating payment plans and handling customer queries.',
      responsibilities: [
        'Monitor outstanding accounts and follow up on outstanding payments',
        'Negotiate payoff deadlines and payment plans',
        'Handle customer queries and complaints',
        'Support working capital improvements through debtor and creditor management',
      ],
      achievements: ['Improved working capital by streamlining debtor and creditor balances'],
      display_order: 3,
    },
    {
      position: 'Analyst Intern',
      organization: 'County Government of Kisumu — Revenue Department',
      start_date: '2018-09-01',
      end_date: '2019-04-30',
      is_current: 0,
      description:
        'Monitoring agent performance, reconciling payment reports, and performing data entry, verification, correction and review.',
      responsibilities: [
        'Monitor agent performance and advise and motivate agents to hit targets',
        'Reconcile payment reports',
        'Perform data entry, verification, correction and review',
      ],
      display_order: 4,
    },
  ];

  for (const item of experience) {
    const existing = db
      .prepare('SELECT id FROM experience WHERE organization = ? AND position = ? AND start_date = ?')
      .get(item.organization, item.position, item.start_date);
    const payload = JSON.stringify(item.responsibilities);
    const now = NOW;
    if (existing) {
      db.prepare(`
        UPDATE experience SET position = ?, organization = ?, start_date = ?, end_date = ?,
          is_current = ?, description = ?, responsibilities = ?, achievements = ?, display_order = ?, updated_at = ?
        WHERE id = ?
      `).run(
        item.position, item.organization, item.start_date, item.end_date, item.is_current,
        item.description, payload, JSON.stringify(item.achievements ?? []), item.display_order, now, existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO experience (position, organization, start_date, end_date, is_current,
          description, responsibilities, achievements, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.position, item.organization, item.start_date, item.end_date, item.is_current,
        item.description, payload, JSON.stringify(item.achievements ?? []), item.display_order, now, now
      );
    }
  }

  // ---- Education ----
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
      institution: 'Kisumu Girls\' High School',
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
      description: 'Advanced level — ongoing. The qualification is in progress and is not yet complete.',
      display_order: 3,
    },
  ];

  for (const item of education) {
    const existing = db
      .prepare(
        'SELECT id FROM education WHERE institution = ? AND qualification = ? AND status = ?'
      )
      .get(item.institution, item.qualification, item.status);
    if (existing) {
      db.prepare(`
        UPDATE education SET field_of_study = ?, start_date = ?, end_date = ?,
          status = ?, description = ?, display_order = ?, updated_at = ?
        WHERE id = ?
      `).run(
        item.field_of_study, item.start_date, item.end_date, item.status,
        item.description, item.display_order, NOW, existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO education (institution, qualification, field_of_study, start_date,
          end_date, status, description, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.institution, item.qualification, item.field_of_study, item.start_date,
        item.end_date, item.status, item.description, item.display_order, NOW, NOW
      );
    }
  }

  // ---- Expertise ----
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
      description: 'Bookkeeping services and tax advisory for clients transitioning to digital tax systems such as iTax.',
      category: 'Advisory',
      display_order: 4,
      is_featured: true,
    },
    {
      title: 'Financial analysis',
      description: 'Performance analysis, reconciliations and data-driven recommendations that support business decisions.',
      category: 'Analysis',
      display_order: 5,
      is_featured: true,
    },
    {
      title: 'Client advisory and relationship management',
      description: 'Working with NGOs, SACCOs and corporate clients; handling queries and complaints; building lasting client relationships.',
      category: 'Advisory',
      display_order: 6,
      is_featured: true,
    },
    {
      title: 'Accounting systems',
      description: 'Xero, QuickBooks Online and Microsoft Excel; supporting clients in the transition to digital tax systems.',
      category: 'Systems',
      display_order: 7,
      is_featured: false,
    },
  ];

  for (const item of expertise) {
    const existing = db
      .prepare('SELECT id FROM expertise WHERE title = ? AND category = ?')
      .get(item.title, item.category);
    if (existing) {
      db.prepare(`
        UPDATE expertise SET description = ?, category = ?, display_order = ?, is_featured = ?, updated_at = ?
        WHERE id = ?
      `).run(item.description, item.category, item.display_order, item.is_featured ? 1 : 0, NOW, existing.id);
    } else {
      db.prepare(`
        INSERT INTO expertise (title, description, category, display_order, is_featured, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.title,
        item.description,
        item.category,
        item.display_order,
        item.is_featured ? 1 : 0,
        NOW,
        NOW
      );
    }
  }

  console.log('Seeded public portfolio content from the CV.');
  console.log('No administrator account or referee contact details were created.');
});

try {
  tx();
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
