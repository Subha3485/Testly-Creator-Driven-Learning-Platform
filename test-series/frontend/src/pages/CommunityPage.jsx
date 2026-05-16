const posts = [
  { id: "1", author: "Sunita Kapoor", title: "New Quant video live!", excerpt: "Watch the new algebra tricks class and solve the linked practice set.", likes: 290, comments: 34 },
  { id: "2", author: "Rahul Mehra", title: "Sunday reasoning live class", excerpt: "Join the free live class on seating arrangements and get a survival checklist.", likes: 220, comments: 18 },
  { id: "3", author: "Neha Sharma", title: "Vocabulary challenge", excerpt: "Daily short questions for fast vocab recall. Share your answers in comments.", likes: 180, comments: 12 }
];

export default function CommunityPage() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__content">
          <span className="label">Community</span>
          <h1>Join the study community and stay engaged.</h1>
          <p>Browse announcements, polls, creator posts, and discussion threads from top teachers.</p>
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__head">
          <h2>Latest posts</h2>
          <button type="button" className="primary">Post an update</button>
        </div>
        <div className="series-grid">
          {posts.map((post) => (
            <article key={post.id} className="series-card">
              <strong>{post.title}</strong>
              <p>{post.excerpt}</p>
              <div className="series-card__footer">
                <span>{post.author}</span>
                <span>{post.likes} likes · {post.comments} comments</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
