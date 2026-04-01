import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";
import deleteIcon from "./assets/delete.png";
import logo from "./assets/logo.png";

const supabase = createClient(
  "https://rmmnxjuofthqugkrwmqf.supabase.co",
  "sb_publishable_hjgpNpwV4UWq-w6iVlpTXw_BJ_Whjs5"
);


export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [chatEmail, setChatEmail] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
const [selectedMsgId, setSelectedMsgId] = useState(null);

const formatTime = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  // Convert to IST manually (+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);

  return istTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
  // 🔐 Auth state listener
  useEffect(() => {
  if (!chatEmail || !user) return;

  // Load existing messages
  fetchMessages(chatEmail);

  // Subscribe to realtime changes
  const channel = supabase
    .channel("messages-channel")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const msg = payload.new;

        // Only update if message belongs to current chat
        if (
          (msg.sender_email === user.email &&
            msg.receiver_email === chatEmail) ||
          (msg.sender_email === chatEmail &&
            msg.receiver_email === user.email)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [chatEmail, user]);
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);
  // 🟢 Google Login
 const signInWithGoogle = async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google"
  });
};

  // 🚪 Logout
  const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
    setUser(null);
    setUsers([]);
  } catch (err) {
    console.log("Logout error:", err);
  }
};



 


useEffect(() => {
  const handleUser = async (currentUser) => {
    if (!currentUser) return;

    const name =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      "User";

    const email = currentUser.email;

    try {
      const { data: existingUser, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email);

      if (error) {
        console.log("Fetch error:", error);
        return;
      }

      if (!existingUser || existingUser.length === 0) {
        await supabase.from("users").insert([
          {
            email,
            name,
          },
        ]);
      }
    } catch (err) {
      console.log("Error:", err);
    }
  };

  // ✅ Get session
  supabase.auth.getSession().then(({ data }) => {
    const currentUser = data.session?.user || null;
    setUser(currentUser);
    handleUser(currentUser);
  });

  // ✅ Listen auth changes
  const { data: listener } = supabase.auth.onAuthStateChange(
    (event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      handleUser(currentUser);
    }
  );

  return () => listener.subscription.unsubscribe();
}, []);


  // 👥 Fetch users
  const fetchUsers = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("email, name");

  if (error) {
    console.log(error);
    return;
  }

  if (data) {
    setUsers(data.filter((u) => u.email !== user?.email));
  }
};

  useEffect(() => {
    if (user) fetchUsers();
  }, [user]);

  // 💬 Fetch messages
  const fetchMessages = async (targetEmail) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_email.eq.${user.email},receiver_email.eq.${targetEmail}),and(sender_email.eq.${targetEmail},receiver_email.eq.${user.email})`
      )
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  // 📤 Send message
  const sendMessage = async () => {
  if (!text || !chatEmail) return;

  // 👇 ADD THIS HERE
  const newMsg = {
    id: Date.now(), // temporary id (IMPORTANT)
    sender_email: user.email,
    receiver_email: chatEmail,
    content: text,
    created_at: new Date().toISOString(),
  };

  // ✅ 1. Show instantly in UI
  setMessages((prev) => [...prev, newMsg]);

  // ✅ 2. Save to database
  const { error } = await supabase.from("messages").insert([
    {
      sender_email: user.email,
      receiver_email: chatEmail,
      content: text,
    },
  ]);

  if (error) {
    console.log("Send error:", error);
  }

  setText("");
};

//delete msg new
const deleteMessage = async () => {
  if (!selectedMsgId) return;

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", selectedMsgId);

  if (error) {
    console.log("Delete error:", error);
  }

  setShowDeleteModal(false);
  setSelectedMsgId(null);
};


  //delete message old
/*const deleteMessage = async (id) => {
  const confirmDelete = window.confirm("Delete this message?");

  if (!confirmDelete) return;

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", id);

  if (error) {
    console.log("Delete error:", error);
  }
};  */

  // ⚡ Realtime messages
 /* useEffect(() => {
    if (!chatEmail || !user) return;

    fetchMessages(chatEmail);

    const channel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;

          if (
            (msg.sender_email === user.email &&
              msg.receiver_email === chatEmail) ||
            (msg.sender_email === chatEmail &&
              msg.receiver_email === user.email)
          ) {
            setMessages((prev) => {
        const exists = prev.find((m) => m.id === msg.id);
        if (exists) return prev;
        return [...prev, msg];
      });
            //setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chatEmail, user]);
*/

useEffect(() => {
  if (!chatEmail || !user) return;

  fetchMessages(chatEmail);

  const channel = supabase
    .channel("chat")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const msg = payload.new;

        if (
          (msg.sender_email === user.email &&
            msg.receiver_email === chatEmail) ||
          (msg.sender_email === chatEmail &&
            msg.receiver_email === user.email)
        ) {
         setMessages((prev) => {
  const exists = prev.find(
    (m) =>
      m.id === msg.id ||
      (
        m.content === msg.content &&
        m.sender_email === msg.sender_email &&
        m.receiver_email === msg.receiver_email
      )
  );

  if (exists) return prev;

  return [...prev, msg];
});
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "messages" },
      (payload) => {
        const deletedId = payload.old.id;

        setMessages((prev) =>
          prev.filter((msg) => msg.id !== deletedId)
        );
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [chatEmail, user]);
  // 🔐 LOGIN UI (Google only)
 if (!user) {
  return (
    <div className="login">
      <div className="loginBox">
        <div className="logoTitle">
  <img src={logo} alt="logo" className="logo" />
  <h2>Textify</h2>
</div>
        <button onClick={signInWithGoogle} className="googleBtn">
          <img src="/google.png" height="25px" width="25px" />Continue with Google
        </button>
      </div>
    {/* 👇 ADD FOOTER HERE */}
      <div className="footer">
        Made with <span className="heart">❤️</span> from Sachin Adi
      </div>
    </div>
  );
}

  // 💬 CHAT UI
  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <h3>{user.email}</h3>

        <button onClick={handleLogout} className="logoutBtn">
          Logout
        </button>

        <h2>Users</h2>

        {users.map((u, i) => (
          <div
            key={i}
            className={`user ${chatEmail === u.email ? "activeUser" : ""}`}
    onClick={() => setChatEmail(u.email)}
          >
            {u.name || u.email}
          </div>
        ))}
      </div>

      {/* Chat */}
      <div className="chat">
        <div className="messages">
  {messages.map((msg, i) => (
    <div
      key={i}
      className={`message ${
        msg.sender_email === user.email ? "sent" : "received"
      }`}
    >
      <div className="msgText">{msg.content}</div>
      <div className="msgTime">{formatTime(msg.created_at)}</div>

      {/* ✅ DELETE BUTTON (ONLY FOR SENDER) */}
      {msg.sender_email === user.email && (
        <button
          className="deleteBtn"
          onClick={() => {
  setSelectedMsgId(msg.id);
  setShowDeleteModal(true);
}}
        >
          <img src={deleteIcon} alt="delete" className="deleteIcon" />
        </button>
      )}
    </div>
  ))}
    <div ref={messagesEndRef}></div>
</div>

        {chatEmail && (
          <div className="inputBox">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        )}
      </div>
{showDeleteModal && (
  <div className="modalOverlay">
    <div className="modalBox">
      <p>Delete this message?</p>

      <div className="modalActions">
        <button className="cancelBtn" onClick={() => setShowDeleteModal(false)}>
          Cancel
        </button>

        <button className="deleteConfirmBtn" onClick={deleteMessage}>
          Delete
        </button>
      </div>
    </div>
  </div>
)}

      
    </div>
  );
}
