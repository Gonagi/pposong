import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSetRecoilState } from "recoil";
import { navState } from "../../recoil/atoms";
import styled from "styled-components";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faBan, faFlag } from "@fortawesome/free-solid-svg-icons";

function Chat() {
<<<<<<< Updated upstream
  const { author } = useParams();

=======
  const { nickname } = useParams(); // URL에서 nickname을 가져옴
  // const { author } = useParams();
  const setNav = useSetRecoilState(navState);
  setNav("market");
>>>>>>> Stashed changes

  const navigate = useNavigate();

  const opponentNickName = nickname === "nickName1" ? "nickName2" : "nickName1";

  const onScheduleBtnClick = () => {//거래 일정 잡기 버튼 누르면
    navigate('/market/schedule');//해당 페이지로 이동
  }

  const [messages, setMessages] = useState([]);//훅을 사용하여 messages와 setMessages를 선언
  //messages는 상태 변수이고 setMessages는 이 상태를 업데이트 하는 함수
  const [input, setInput] = useState("");
  const [blocked, setBlocked] = useState(false); // 차단 여부 상태 추가
  // const [opponentNickName, setOpponentNickName] = useState(nickname === "nickName1" ? "nickName2" : "nickName1");


  const fetchMessages = async () => {//서버로부터 메시지를 가져오는 비동기 함수
    try {
      const response = await axios.get('http://localhost:3001/message');//엔드포인트에서 데이터 가져옴
      console.log('Fetched messages:', response.data);//확인용 콘솔 로그 추가
      //response.data는 서버로부터 받아온 메시지 데이터 배열
      //배열의 각 요소(msg)를 새로운 형식으로 변환하여 새로운 배열 formattedMessages를 생성
      const formattedMessages = response.data.map(msg => ({
        timestamp: new Date().toLocaleTimeString(),//현재 시간을 문자열로 변환
        author: msg.senderNickName,//메시지가 내가 보낸 것인지 다른 사람이 보낸 것인지를 구분
        senderId: msg.senderId,
        text: msg.content//서버로부터 받아온 메시지 실제 내용
      }));
      setMessages(formattedMessages);//messages 상태를 formattedMessages 배열로 업데이트하는 함수
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  useEffect(() => {//컴포넌트가 마운트되거나 업데이트될 때 특정 작업을 수행할 수 있도록 함
    fetchMessages();//컴포넌트가 처음 마운트될 때 즉시 fetchMessages 함수를 호출하여 서버로부터 메시지 가져옴
    const interval = setInterval(fetchMessages, 5000);//fetchMessages함수를 호출하는 타이머(서버로부터 5초마다 새로운 메시지 가져옴)
    return () => clearInterval(interval);//타이머 정리
  }, []);//두번째 인수로 빈 배열을 전달하므로, 이 효과는 컴포넌트가 처음 마운트될 때만 실행됨

  const handleSendMessage = async () => {//사용자가 메시지 보낼 때 호출되는 비동기 함수
    if (input.trim() && !blocked) {//input이 공백이 아닌 경우에만 메시지 전송 & 입력값 앞뒤 공백을 제거한 문자열을 반환 & 차단된 상태가 아닌 경우에만 메시지 전송
      const senderId = nickname === "nickName1" ? 1 : 2; // 메시지를 보낸 사용자의 ID
      const newMessage = {
        chatRoomId: 1,//메시지가 속한 채팅방의 ID
        senderId, // 메시지를 보낸 사용자의 ID
        // senderId: nickname === "nickName1" ? 1 : 2, //메시지를 보낸 사용자의 ID
        senderNickName: nickname,//사용자의 닉네임
        content: input,//사용자가 입력한 메시지 내용
      };

      try {
        await axios.post('http://localhost:3001/message', newMessage);//newMessage 객체를 서버에 전송
        // await axios.post('http://localhost:3001/message', { message: [newMessage] });
        // setMessages([...messages, newMessage]);
        setMessages(prevMessages => [//setMessage
          ...prevMessages,
          { author: nickname, senderId, text: input, timestamp: new Date().toLocaleTimeString() }
        ]);
        setInput("");//입력 필드 비우기
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      console.log(nickname);
      handleSendMessage();
    }
  };

  const handleBlockUser = () => {
    setBlocked(true);
    alert(`${opponentNickName}을 차단하였습니다.`);
  };

  const handleReportUser = async () => {
    try {
      //백엔드 링크로 추후 변경
      // await axios.post('http://localhost:3001/report', { reporter: nickname, reported: opponentNickName });
      alert(`${nickname}이 ${opponentNickName}를 신고하였습니다.`);
    } catch (error) {
      console.error('Failed to report user:', error);
    }
  };

  return (
    <React.Fragment>
      <Header>
        <UserInfo>
          <FontAwesomeIcon icon={faUserCircle} size="2x" />
          <Nickname>{opponentNickName}</Nickname>
        </UserInfo>
        <ActionButtons>
          <Button onClick={handleBlockUser}>
            <FontAwesomeIcon icon={faBan} /> 차단하기
          </Button>
          <Button onClick={handleReportUser}>
            <FontAwesomeIcon icon={faFlag} /> 신고하기
          </Button>
        </ActionButtons>
      </Header>
      <ChatContainer>
        {messages.map((msg, index) => (
          // <Message key={index} isMe={msg.author === nickname}>
          <Message key={index} isMe={msg.senderId === (nickname === "nickName1" ? 1 : 2)}>
            {/* <strong>{msg.author}</strong>: {msg.text} */}
            <strong>{msg.senderId === (nickname === "nickName1" ? 1 : 2) ? "Me" : msg.author}</strong>: {msg.text}
            <Timestamp>{msg.timestamp}</Timestamp>
          </Message>
        ))}
      </ChatContainer>
      <InputContainer>
        <ChatInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요..."
          disabled={blocked} // 차단된 경우 입력 비활성화
        />
        <SendButton onClick={handleSendMessage}>전송</SendButton>
      </InputContainer>
      <ScheduleBtn onClick={() => onScheduleBtnClick()}>거래 일정 잡기</ScheduleBtn>
    </React.Fragment>
  );
}

export default Chat;


const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
`;

const Nickname = styled.span`
  margin-left: 10px;
  font-size: 18px;
  font-weight: bold;
`;

const ActionButtons = styled.div`
  display: flex;
`;

const Button = styled.button`
  background-color: #ff6b6b;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 15px;
  margin-left: 10px;
  cursor: pointer;
  &:hover {
    background-color: #ff4b4b;
  }
`;

const ScheduleBtn = styled.div`
  background-color: tomato;
  padding: 30px;
  cursor: pointer;
  &:hover {
    background-color: whitesmoke;
  }
`;

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;
  height: 60vh;
  overflow-y: auto;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
`;

const Message = styled.div`
  align-self: ${props => (props.isMe ? 'flex-end' : 'flex-start')};
  background-color: ${props => (props.isMe ? '#daf8da' : '#fff')};
  padding: 10px;
  margin: 5px;
  border-radius: 10px;
  max-width: 60%;
`;

const Timestamp = styled.span`
  display: block;
  font-size: 0.7em;
  color: #888;
`;

const InputContainer = styled.div`
  display: flex;
  padding: 10px;
  border-top: 1px solid #ccc;
  background-color: #fff;
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-right: 10px;
`;

const SendButton = styled.button`
  padding: 10px 20px;
  background-color: tomato;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  &:hover {
    background-color: #e67e22;
  }
`;

// const ScheduleBtn = styled.div`
//   background-color: tomato;
//   padding: 30px;
//   cursor: pointer;
//   &:hover {
//     background-color: whitesmoke;
//   }
// `;

// const ChatContainer = styled.div`
//   display: flex;
//   flex-direction: column;
//   padding: 10px;
//   height: 60vh;
//   overflow-y: auto;
//   background-color: #f0f0f0;
//   border: 1px solid #ccc;
// `;

// const Message = styled.div`
//   align-self: ${props => (props.isMe ? 'flex-end' : 'flex-start')};
//   background-color: ${props => (props.isMe ? '#daf8da' : '#fff')};
//   padding: 10px;
//   margin: 5px;
//   border-radius: 10px;
//   max-width: 60%;
// `;

// const Timestamp = styled.span`
//   display: block;
//   font-size: 0.7em;
//   color: #888;
// `;

// const InputContainer = styled.div`
//   display: flex;
//   padding: 10px;
//   border-top: 1px solid #ccc;
//   background-color: #fff;
// `;

// const ChatInput = styled.input`
//   flex: 1;
//   padding: 10px;
//   border: 1px solid #ccc;
//   border-radius: 5px;
//   margin-right: 10px;
// `;

// const SendButton = styled.button`
//   padding: 10px 20px;
//   background-color: tomato;
//   color: #fff;
//   border: none;
//   border-radius: 5px;
//   cursor: pointer;
//   &:hover {
//     background-color: #e67e22;
//   }
// `;
