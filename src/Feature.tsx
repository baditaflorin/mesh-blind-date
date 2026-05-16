import { useEffect, useState } from "react";
import {
  QRExchange,
  makeScanPayload,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Profile = { name: string; about: string; lookingFor: string };
type Vote = { from: string; to: string; like: boolean };

const KEY = (p: string, k: string) => `${p}:bd:${k}`;

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="viral-screen">
        <h1>blind date</h1>
        <p className="viral-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const [name, setName] = useState(
    () => localStorage.getItem(KEY(config.storagePrefix, "name")) ?? "",
  );
  const [about, setAbout] = useState(
    () => localStorage.getItem(KEY(config.storagePrefix, "about")) ?? "",
  );
  const [lookingFor, setLookingFor] = useState(
    () => localStorage.getItem(KEY(config.storagePrefix, "lookingFor")) ?? "",
  );
  const [revealMutual, setRevealMutual] = useState(false);
  const [, rerender] = useState(0);

  useEffect(
    () => localStorage.setItem(KEY(config.storagePrefix, "name"), name),
    [name, config.storagePrefix],
  );
  useEffect(
    () => localStorage.setItem(KEY(config.storagePrefix, "about"), about),
    [about, config.storagePrefix],
  );
  useEffect(
    () => localStorage.setItem(KEY(config.storagePrefix, "lookingFor"), lookingFor),
    [lookingFor, config.storagePrefix],
  );

  useEffect(() => {
    const ps = room.doc.getMap<Profile>("profiles");
    const vs = room.doc.getArray<Vote>("votes");
    const cb = () => rerender((n) => n + 1);
    ps.observe(cb);
    vs.observe(cb);
    return () => {
      ps.unobserve(cb);
      vs.unobserve(cb);
    };
  }, [room]);

  const profiles = room.doc.getMap<Profile>("profiles");
  const votes = room.doc.getArray<Vote>("votes");

  useEffect(() => {
    if (name.trim()) profiles.set(room.peerId, { name: name.trim(), about, lookingFor });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, about, lookingFor, room.peerId]);

  const vote = (to: string, like: boolean) => {
    if (to === room.peerId) return;
    // upsert: remove prior vote from me to this person, then add new
    const arr = votes.toArray();
    for (let i = arr.length - 1; i >= 0; i--) {
      const v = arr[i]!;
      if (v.from === room.peerId && v.to === to) {
        votes.delete(i, 1);
      }
    }
    votes.push([{ from: room.peerId, to, like }]);
  };

  const profileList: Array<Profile & { peerId: string }> = [];
  profiles.forEach((p, k) => {
    if (k !== room.peerId) profileList.push({ ...p, peerId: k });
  });

  const voteList = votes.toArray();
  const myVoteOn = (to: string) => voteList.find((v) => v.from === room.peerId && v.to === to);
  const theyLikeMe = (other: string) =>
    voteList.some((v) => v.from === other && v.to === room.peerId && v.like);

  const mutualMatches = profileList.filter((p) => myVoteOn(p.peerId)?.like && theyLikeMe(p.peerId));

  const myPayload = makeScanPayload(room.roomId, room.peerId, name.trim() || "anon");

  return (
    <div className="viral-screen">
      <header>
        <h1>blind date</h1>
        <p className="viral-status">
          {profiles.size} profiles · {voteList.length} votes ·{" "}
          {revealMutual ? `${mutualMatches.length} mutual matches` : "vote anyone"}
        </p>
      </header>

      <section>
        <h2 className="viral-section-title">your profile</h2>
        <input
          className="viral-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          maxLength={48}
        />
        <textarea
          className="bd-area"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="about you (one or two sentences)"
          rows={2}
        />
        <textarea
          className="bd-area"
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value)}
          placeholder="what you're looking for"
          rows={2}
        />
      </section>

      <QRExchange
        myPayload={myPayload}
        showLabel="your QR — meet someone face to face"
        scanLabel="scan after chatting"
        onScan={() => {
          /* presence only; voting is done in the list below */
        }}
      />

      <section>
        <h2 className="viral-section-title">profiles in the room</h2>
        {profileList.length === 0 ? (
          <p className="viral-empty">nobody else yet</p>
        ) : (
          <ul className="bd-list">
            {profileList.map((p) => {
              const mv = myVoteOn(p.peerId);
              const isMatch = mv?.like && theyLikeMe(p.peerId);
              return (
                <li key={p.peerId} className="viral-card">
                  <strong>{p.name}</strong>
                  {p.about && <p className="bd-about">{p.about}</p>}
                  {p.lookingFor && <p className="bd-looking">looking for: {p.lookingFor}</p>}
                  <div className="bd-vote-row">
                    <button
                      type="button"
                      className={mv?.like ? "viral-primary" : "viral-ghost"}
                      onClick={() => vote(p.peerId, true)}
                    >
                      ❤️ like
                    </button>
                    <button
                      type="button"
                      className={mv && !mv.like ? "viral-primary" : "viral-ghost"}
                      onClick={() => vote(p.peerId, false)}
                    >
                      🤷 pass
                    </button>
                    {revealMutual && isMatch && <span className="bd-match">💞 mutual!</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <button type="button" className="viral-primary" onClick={() => setRevealMutual((r) => !r)}>
        {revealMutual ? "🙈 hide matches" : "✨ reveal mutual matches"}
      </button>

      {revealMutual && mutualMatches.length > 0 && (
        <div className="bd-banner">
          🎉 you have {mutualMatches.length} mutual{" "}
          {mutualMatches.length === 1 ? "match" : "matches"}!
        </div>
      )}
    </div>
  );
}
