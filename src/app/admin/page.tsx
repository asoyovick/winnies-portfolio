import { getServerExperience, getServerEducation, getServerExpertise, getServerArticles, getServerMedia, getServerInquiries } from '@/lib/admin-helpers';
import Link from 'next/link';

export default async function Dashboard() {
  const [experience, education, expertise, articles, media, inquiries] =
    await Promise.all([
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

  return (
    <div className="admin-canvas">
      <div className="admin-canvas__head">
        <div>
          <h1 className="admin-canvas__title">Dashboard</h1>
          <p className="admin-canvas__sub">
            Manage Winnie Awuor Otieno's portfolio content and media.
          </p>
        </div>
        <Link href="/admin/articles" className="btn">
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

      <section style={{ marginBottom: '2rem' }}>
        <h2 className="admin-canvas__title" style={{ fontSize: '1.1rem' }}>
          Quick actions
        </h2>
        <div className="admin-actions-row">
          <Link href="/admin/profile" className="btn">
            Edit profile
          </Link>
          <Link href="/admin/experience" className="btn btn--text">
            Experience
          </Link>
          <Link href="/admin/education" className="btn btn--text">
            Education
          </Link>
          <Link href="/admin/expertise" className="btn btn--text">
            Expertise
          </Link>
          <Link href="/admin/media" className="btn btn--text">
            Media library
          </Link>
          <Link href="/admin/inquiries" className="btn btn--text">
            Inquiries
          </Link>
        </div>
      </section>

      <section>
        <h2 className="admin-canvas__title" style={{ fontSize: '1.1rem' }}>
          Recent content
        </h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '260px' }}>Title</th>
              <th>Type</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '170px' }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...articles.map((a) => ({ id: a.id, title: a.title, slug: a.slug, updated_at: a.updated_at, type: 'article' as const, status: a.status })),
              ...inquiries.map((i) => ({ id: i.id, title: i.name, slug: '', updated_at: i.created_at, type: 'inquiry' as const })),
            ]
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              )
              .slice(0, 8)
              .map((item) => {
                const isArticle = item.type === 'article';
                return (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={isArticle ? `/admin/articles/${item.slug}` : `/admin/inquiries/${item.id}`}
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td>
                      <span className="admin-badge">
                        {isArticle ? 'Insight' : 'Inquiry'}
                      </span>
                    </td>
                    <td>
                      {isArticle ? (
                        <span className={`admin-badge ${item.status === 'published' ? 'admin-badge--ongoing' : ''}`}>
                          {item.status}
                        </span>
                      ) : (
                        <span className="admin-badge">New</span>
                      )}
                    </td>
                    <td>
                      {new Date(item.updated_at).toLocaleDateString('en-GB')}
                    </td>
                    <td>
                      {isArticle ? (
                        <Link href={`/admin/articles/${item.slug}/edit`} className="btn btn--text" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginRight: '0.3rem' }}>Edit</Link>
                      ) : null}
                      <button onClick={() => {}} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: '#7a2e1e', border: '1px solid var(--surface)', background: 'transparent', cursor: 'pointer' }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 className="admin-canvas__title" style={{ fontSize: '1.1rem' }}>
          Portfolio at a glance
        </h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Section</th>
              <th style={{ width: '140px' }}>Items</th>
              <th style={{ width: '260px' }}>Manage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Profile</td>
              <td>1</td>
              <td><Link href="/admin/profile">Edit</Link></td>
            </tr>
            <tr>
              <td>Experience</td>
              <td>{experience.length}</td>
              <td><Link href="/admin/experience">Edit</Link></td>
            </tr>
            <tr>
              <td>Education &amp; qualifications</td>
              <td>{education.length}</td>
              <td><Link href="/admin/education">Edit</Link></td>
            </tr>
            <tr>
              <td>Expertise</td>
              <td>{expertise.length}</td>
              <td><Link href="/admin/expertise">Edit</Link></td>
            </tr>
            <tr>
              <td>Insights / articles</td>
              <td>{articles.length}</td>
              <td><Link href="/admin/articles">Edit</Link></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
