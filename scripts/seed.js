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
      hero_text = '',
      updated_at = ?
    WHERE id = 1
  `).run(NOW);

  const bio = [
    'Winnie Awuor Otieno is an accounting, audit and tax professional based in Kisumu, Kenya.',
    'She is a Semi Senior in Audit & Consulting at Ronalds LLP (October 2023 to present), where she prepares and reviews VAT, PAYE, withholding tax and corporation tax returns for NGOs, SACCOs and corporate clients, conducts financial audits with a tax focus, and supports clients through KRA compliance checks.',
    'Earlier, she built commercial foundations as a Sales Person at Home Living Kisumu (2020–2023) — recognised as the most performing Sales Executive in 2021 and 2022 — and worked in revenue debt collection and revenue analysis with the County Government of Kisumu.',
    'She holds a Bachelor of Science in Economics and Statistics from Egerton University (Second Class Upper Division) and is progressing the Certified Public Accountant (CPA) qualification at Advanced level — the qualification is ongoing and is not yet complete.',
  ].join('\n\n');

  db.prepare(`
    UPDATE profile_settings SET biography = ?, updated_at = ? WHERE id = 1
  `).run(bio, NOW);

  const heroText = [
    'Accounting, audit and tax support for NGOs, SACCOs and corporate clients.',
    'VAT, PAYE, withholding tax and corporation tax returns, financial audits with a tax focus, bookkeeping and tax advisory.',
  ].join(' ');

  db.prepare(`
    UPDATE profile_settings SET hero_text = ?, updated_at = ? WHERE id = 1
  `).run(heroText, NOW);

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
          is_current = ?, description = ?, responsibilities = ?, display_order = ?, updated_at = ?
        WHERE id = ?
      `).run(
        item.position, item.organization, item.start_date, item.end_date, item.is_current,
        payload, item.display_order, now, existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO experience (position, organization, start_date, end_date, is_current,
          description, responsibilities, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.position, item.organization, item.start_date, item.end_date, item.is_current,
        item.description, payload, item.display_order, now, now
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
    },
    {
      title: 'Tax return preparation',
      description:
        'Preparing and reviewing VAT, PAYE, withholding tax and corporation tax returns for NGOs, SACCOs and corporate clients.',
      category: 'Tax',
      display_order: 2,
    },
    {
      title: 'Financial audit and reporting',
      description:
        'Financial audits with a tax focus; identifying tax exposure and recommending corrective measures; preparing supporting documentation and reconciliations.',
      category: 'Audit',
      display_order: 3,
    },
    {
      title: 'Bookkeeping and tax advisory',
      description: 'Bookkeeping services and tax advisory for clients transitioning to digital tax systems such as iTax.',
      category: 'Advisory',
      display_order: 4,
    },
    {
      title: 'Financial analysis',
      description: 'Performance analysis, reconciliations and data-driven recommendations that support business decisions.',
      category: 'Analysis',
      display_order: 5,
    },
    {
      title: 'Client advisory and relationship management',
      description: 'Working with NGOs, SACCOs and corporate clients; handling queries and complaints; building lasting client relationships.',
      category: 'Advisory',
      display_order: 6,
    },
    {
      title: 'Accounting systems',
      description: 'Xero, QuickBooks Online and Microsoft Excel; supporting clients in the transition to digital tax systems.',
      category: 'Systems',
      display_order: 7,
    },
  ];

  for (const item of expertise) {
    const existing = db
      .prepare('SELECT id FROM expertise WHERE title = ? AND category = ?')
      .get(item.title, item.category);
    if (existing) {
      db.prepare(`
        UPDATE expertise SET description = ?, category = ?, display_order = ?, updated_at = ?
        WHERE id = ?
      `).run(item.description, item.category, item.display_order, NOW, existing.id);
    } else {
      db.prepare(`
        INSERT INTO expertise (title, description, category, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(item.title, item.description, item.category, item.display_order, NOW, NOW);
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
