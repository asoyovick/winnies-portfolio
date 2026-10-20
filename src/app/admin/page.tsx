import Link from 'next/link';
import {
  getServerArticles,
  getServerEducation,
  getServerExpertise,
  getServerExperience,
  getServerInquiries,
  getServerMedia,
  getServerProfile,
} from '@/lib/admin-helpers';
import { formatDateTime } from '@/lib/admin-client';

export default async function Dashboard() {
  const [profile, experience, education, expertise, articles, media, inquiries] =
    await Promise.all([
      getServerProfile(),
      getServerExperience(),
      getServerEducation(),
      getServerExpertise(),
      getServerArticles(),
      getServerMedia(),
      getServerInquiries(),
    ]);

  const published = articles.filter((a) => a.status === 'published').length;
  const drafts = articles.filter((a) => a.status === 'draft').length;
  const unread = inquiries.filter((i) => !i.is_read).length;

  const recent = [
    ...articles.map((a) => ({
      kind: 'article' as const,
      id: a.id,
      title: a.title,
      status: a.status,
      updated_at: a.updated_at,
      href: `/admin/articles/${a.slug}/edit`,
    })),
    ...inquiries.map((i) => ({
      kind: 'inquiry' as const,
      id: i.id,
      title: `Inquiry from ${i.name}`,
      status: i.is_read ? 'read' : 'new',
      updated_at: i.created_at,
      href: '/admin/inquiries',
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 8);

  return (
    <div>
      <div className="admin-canvas__head">
        <div>
          <h1 className="admin-canvas__title">Dashboard</h1>
          <p className="admin-canvas__sub">
            {profile?.display_name
              ? `${profile.display_name} — ${profile.professional_title}`
              : 'Manage the public profile, experience, education and insights.'}
          </p>
        </div>
        <Link href="/admin/articles/new" className="btn">
          New insight
        </Link>
      </div>

      <div className="admin-kpis">
        <div className="admin-kpi">
          <p className="admin-kpi__label">Published insights</p>
          <p className="admin-kpi__value">{published}</p>
        </div>
        <div className="admin-kpi">
          <p className="admin-kpi__label">Draft insights</p>
          <p className="admin-kpi__value">{drafts}</p>
        </div>
        <div className="admin-kpi">
          <p className="admin-kpi__label">Media assets</p>
          <p className="admin-kpi__value">{media.length}</p>
        </div>
        <div className="admin-kpi">
          <p className="admin-kpi__label">Unread inquiries</p>
          <p className="admin-kpi__value">{unread}</p>
        </div>
      </div>

      <section className="admin-section">
        <h2 className="admin-section__title">Quick actions</h2>
        <div className="admin-actions-row" style={{ marginTop: 0 }}>
          <Link href="/admin/profile" className="btn">
            Edit profile
          </Link>
          <Link href="/admin/media" className="btn btn--text">
            Upload a photo or CV
          </Link>
          <Link href="/admin/articles/new" className="btn btn--text">
            Write an insight
          </Link>
          <Link href="/admin/inquiries" className="btn btn--text">
            Read inquiries
          </Link>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">Recent updates</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((item) => (
              <tr key={`${item.kind}-${item.id}`}>
                <td>
                  <Link href={item.href}>{item.title}</Link>
                </td>
                <td>{item.kind === 'article' ? 'Insight' : 'Inquiry'}</td>
                <td>
                  <span
                    className={`admin-badge${
                      item.status === 'published' || item.status === 'read'
                        ? ' admin-badge--ongoing'
                        : ''
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td>{formatDateTime(item.updated_at)}</td>
                <td>
                  <Link href={item.href}>{item.kind === 'article' ? 'Edit' : 'View'}</Link>
                </td>
              </tr>
            ))}
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-note">
                  Nothing has been published or received yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">Portfolio at a glance</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Items</th>
              <th>Manage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Profile</td>
              <td>1</td>
              <td>
                <Link href="/admin/profile">Edit</Link>
              </td>
            </tr>
            <tr>
              <td>Experience</td>
              <td>{experience.length}</td>
              <td>
                <Link href="/admin/experience">Edit</Link>
              </td>
            </tr>
            <tr>
              <td>Education &amp; qualifications</td>
              <td>{education.length}</td>
              <td>
                <Link href="/admin/education">Edit</Link>
              </td>
            </tr>
            <tr>
              <td>Expertise</td>
              <td>{expertise.length}</td>
              <td>
                <Link href="/admin/expertise">Edit</Link>
              </td>
            </tr>
            <tr>
              <td>Insights</td>
              <td>{articles.length}</td>
              <td>
                <Link href="/admin/articles">Edit</Link>
              </td>
            </tr>
            <tr>
              <td>Media library</td>
              <td>{media.length}</td>
              <td>
                <Link href="/admin/media">Edit</Link>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
