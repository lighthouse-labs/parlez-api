const db = require('../../../db/connection/db');

// resources :chatrooms, only: [:index, :show, :create, :update] do
//    resources :messages, only: [:create, :update, :delete]
//  end
//  resources :users, only: [:show, :update, :delete]
//  resources :friends, only: [:index, :create, :update, :delete]
//  resources :blocks, only: [:index, :create, :delete]
//  resources :participants, only: [:create, :update, :delete]

// chatrooms********************
// index
const getAllChatroomMessages = (userId) => {
	return db
		.query({
			text: `SELECT *
      FROM messages m JOIN user_message_views umv on umv.message_id = m.id
      WHERE umv.user_id = $1;
    `,
			values: [userId],
			name: 'get_all_chatroom_messages'
		})
		.then((res) => res.rows);
};
// show
const getChatroomMessages = (userId, chatroomId) => {
	return db
		.query({
			text: `SELECT *
      FROM messages m JOIN user_message_views umv on umv.message_id = m.id
      WHERE umv.user_id = $1 and m.chatroom_id = $2;
    `,
			values: [userId, chatroomId],
			name: 'get_chatroom_messages'
		})
		.then((res) => res.rows);
};
// create
const createChatroom = (
	chatroom_type,
	name,
	user_id,
	users_arr,
	avatar = null
) => {
	return db
		.query({
			text: `
			with new_chat_id as (INSERT INTO chatrooms (chatroom_type, name, avatar) VALUES ($1,$2,$3) returning id)
			insert into participants (user_id, chatroom_id, is_admin) 
				(select user_id, id, user_id = $4 from new_chat_id cross join unnest($5::integer[]) as user_id) returning *
    `,
			values: [chatroom_type, name, avatar, user_id, users_arr],
			name: 'create_chatroom'
		})
		.then((res) => res.rows);
};

// update
const updateChatroom = (chatroom_id, name = null, avatar = null) => {
	let queryString = '';
	let queryValues = [];
	if (!avatar && !name) {
		queryString = `UPDATE chatrooms
		SET name = $2, avatar = $3
		WHERE id = $1
    RETURNING *;
		`;
		queryValues = [chatroom_id, name, avatar];
	} else if (!name) {
		queryString = `UPDATE chatrooms
			SET name = $2
			WHERE id = $1
    RETURNING *;
		`;
		queryValues = [chatroom_id, name];
	} else {
		queryString = `UPDATE chatrooms
		SET avatar = $2
		WHERE id = $1
		RETURNING *;
		`;
		queryValues = [chatroom_id, avatar];
	}
	return db
		.query({
			text: queryString,
			values: queryValues,
			name: 'update_chatroom'
		})
		.then((res) => res.rows[0]);
};
// chatrooms // messages********************
// create

// update
const updateChatroomMessage = (user_id, chatroom_id, message_id, content) => {
	return db
		.query({
			text: `UPDATE messages
			SET content = $4, updated_at = NOW()
			WHERE user_id = $1 and chatroom_id = $2 and id = $3
			RETURNING *;
			`,
			values: [user_id, chatroom_id, message_id, content],
			name: 'update_chatroom_message'
		})
		.then((res) => res.rows[0]);
};
// delete
const deleteMyChatroomMessage = (user_id, chatroom_id, message_id) => {
	return db
		.query({
			text: `UPDATE messages
			SET content = 'This comment has been deleted.', updated_at = NOW()
			WHERE user_id = $1 and chatroom_id = $2 and id = $3
			RETURNING *;
			`,
			values: [user_id, chatroom_id, message_id],
			name: 'delete_chatroom_message'
		})
		.then((res) => res.rows[0]);
};

// users********************
// show
const getUserInfo = (user_id) => {
	return db
		.query({
			text: `SELECT email, username, avatar, status
			FROM users
			where id = $1
			;`,
			values: [user_id],
			name: 'get_user_info'
		})
		.then((res) => res.rows[0]);
};

// friends********************
// index
const getFriendInfo = (user_id) => {
	return db
		.query({
			text: `SELECT *
			FROM friendlists fl join friends f on fl.id = f.friendlist_id
			join users u on u.id = f.friend_id
			where fl.user_id = $1 and f.invitation_accepted_at IS NOT NULL
			;`,
			values: [user_id],
			name: 'get_friend_list'
		})
		.then((res) => res.rows);
};
// create
const addFriend = (user_id, friend_id) => {
	return db
		.query({
			text: `
			BEGIN;
			INSERT INTO friends (friendlist_id, friend_id)
			SELECT id, $2 from friendlists where user_id = $1 returning *;
			INSERT INTO friends (friendlist_id, friend_id)
			SELECT id, $1 from friendlists where user_id = $2 returning *;
			COMMIT;`,
			values: [user_id, friend_id],
			name: 'add_friend'
		})
		.then((res) => res.rows);
};
// update
// delete
const deleteFriend = (user_id, friend_id) => {
	return db
		.query({
			text: `
			DELETE
			FORM friends
			WHERE friendlist_id IN
			(SELECT fl.id
			FROM friendlists fl
			WHERE fl.user_id IN (3,4)) and friend_id IN (3,4)
			RETURNING *;`,
			values: [user_id, friend_id],
			name: 'add_friend'
		})
		.then((res) => res.rows);
};

// blocks********************
// index
// create
// delete

// chatroom / participants********************
// create
const addChatroomParticipant = (user_id, chatroom_id) => {
	return db
		.query({
			text: `
		INSERT INTO participants (user_id, chatroom_id) VALUES ($1,$2) RETURNING *`,
			values: [user_id, chatroom_id],
			name: 'add_chatroom_participant'
		})
		.then((res) => res.rows[0]);
};

// update --> this toggles the is_admin status
const updateChatroomParticipant = (user_id, chatroom_id) => {
	return db.query({
		text: `UPDATE participants
		SET is_admin = NOT is_admin
		WHERE user_id = $1 and chatroom_id = $2
		RETURNING *`,
		values: [user_id, chatroom_id],
		name: 'update_chatroom_participant'
	});
};
// delete
const deleteChatroomParticipant = (user_id, chatroom_id) => {
	return db.query({
		text: `DELETE
		FROM participants
		WHERE user_id = $1 and chatroom_id = $2
		RETURNING *`,
		values: [user_id, chatroom_id],
		name: 'update_chatroom_participant'
	});
};

const getMessages = (user_id, chatroom_id) => {
	return db
		.query({
			text: `SELECT *
      FROM chatrooms c join messages m on c.id = m.chatroom_id
      JOIN user_message_views umv on umv.message_id = m.id
      WHERE umv.user_id = $1 and c.id = $2
    `,
			values: [user_id, chatroom_id],
			name: 'get_message_query'
		})
		.then((res) => res.rows);
};

module.exports = {createChatroom};
