import React, { useEffect, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faRotateRight, faDroplet } from "@fortawesome/free-solid-svg-icons";
import { currentAddressState, navState } from "../../recoil/atoms";
import { useNavigate } from "react-router-dom";
import axios from "axios";

//JSON 서버 API URL(json-server 이용한 프톤트 테스트 용)
// const apiUrl = "http://localhost:3001/boards"
// const apiUrl = "http://localhost:3001/postList"

//서버 제공 url(실제 url)
const apiUrl = "http://localhost:8080/api/boards/with-expected-rain/1" //마지막 1은 userId로 나중에 바꾸기

function Board() {
  const [isRotating, setIsRotating] = useState(false);
  const [posts, setPosts] = useState([]);
  const [editPost, setEditPost] = useState(null);

  const curAddr = useRecoilValue(currentAddressState);
  const setNav = useSetRecoilState(navState);
  setNav("market");

  const navigate = useNavigate();

  //게시물 가져오기
  useEffect(() => {
    fetchPosts();
  }, []);

  // const fetchPosts = async () => {
  //   try {
  //     const response = await axios.get(apiUrl);
  //     setPosts(response.data);
  //   } catch (error) {
  //     console.error("Error fetching posts", error);
  //   }
  // };

  // const fetchPosts = async () => {
  //   try {
  //     const response = await axios.post(apiUrl, {
  //       latitude: curAddr.lat,
  //       longitude: curAddr.lon
  //     }, {
  //       headers: {
  //         'Content-Type': 'application/json'
  //       }
  //     });
  //     setPosts(response.data);
  //   } catch (error) {
  //     console.error("Error fetching posts", error);
  //   }
  // };

  // const fetchPosts = async () => {
  //   const formData = new FormData();
  //   const startDto = {
  //     latitude: parseFloat(curAddr.lat),
  //     longitude: parseFloat(curAddr.lon)
  //   };

  //   formData.append("startDto", new Blob([JSON.stringify(startDto)], { type: 'application/json' }));
  //   // FormData 내용 출력
  //   for (let [key, value] of formData.entries()) {
  //     console.log("서버로 보낸 데이터: ");
  //     console.log(`${key}:`, value);
  //     if (value instanceof Blob) {
  //       value.text().then(text => console.log(`${key} content:`, text));
  //     }
  //   }
  //   try {

  //     const response = await axios.post(apiUrl, formData, {
  //       headers: {
  //         'Content-Type': 'multipart/form-data'
  //       },
  //     });

  //     console.log('Post added successfully:', response.data);

  //     setPosts(response.data);
  //   } catch (error) {
  //     console.error("Error fetching posts", error);
  //   }
  // };

  const fetchPosts = async () => {
    const url = 'http://localhost:8080/api/boards/with-expected-rain/1'; //postman이랑 매치해서 꼭 재확인 할 것!!
    // const url = "http://localhost:8080/api/board"
    const formData = new FormData(); // form-data 객체 생성

    const startDto = {
      // "latitude": parseFloat(curAddr.lat),
      // "longitude": parseFloat(curAddr.lon),
      "latitude": 37.5042,
      "longitude": 127.0044,
    };

    formData.append('startDto', new Blob([JSON.stringify(startDto)], { type: 'application/json' }));

    // FormData 내용 출력
    for (let [key, value] of formData.entries()) {
      console.log("서버로 보낸 데이터: ");
      console.log(`${key}:`, value);
      if (value instanceof Blob) {
        value.text().then(text => console.log(`${key} content:`, text));
      }
    }

    try {
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Response:', response.data);
      setPosts(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  }


  const addPost = async (post) => {
    try {
      const response = await axios.post(apiUrl, post);
      setPosts([...posts, response.data]);
    } catch (error) {
      console.error("Error adding post", error);
    }
  };

  const onPostClick = (post) => {//특정 게시글 클릭시
    localStorage.setItem('expectedRain', post.expectedRain);
    console.log('Expected Rain:', localStorage.getItem('expectedRain'));
    navigate(`/market/post/${post.boardId}`);
  };

  useEffect(() => {
    if (isRotating) {
      const timeout = setTimeout(() => {
        setIsRotating(false);
      }, 1000); // 애니메이션 지속 시간 후 상태를 false로 변경
      return () => clearTimeout(timeout);
    }
  }, [isRotating]);

  const handleRefreshClick = () => {
    //현재 위치 재탐색
    //재탐색한 위치에 해당하는 게시글 목록 다시 불러와야 함
    setIsRotating(true);
    //fetchPosts();//추가
  };

  return (
    <Wrapper>
      <TopBar id="location">
        <div>{curAddr.depth3 || "현재 위치"}</div>
        <RefreshBtn
          onClick={handleRefreshClick}
          animate={{ rotate: isRotating ? 320 : 10 }}
          transition={{ duration: 0.8 }}
        >
          <FontAwesomeIcon icon={faRotateRight} />
        </RefreshBtn>
      </TopBar>
      <ListBox>
        <PostList>
          {posts.map((post) => (
            <Post key={post.boardId} onClick={() => onPostClick(post)}>
              <ImgBox>
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt={post.title} />
                ) : (
                  <img src="https://via.placeholder.com/110" alt="Example" />
                )
                }
              </ImgBox>
              <TextBox>
                <TextContent>
                  <div id="title">{post.title}</div>
                  <div id="content" style={{ color: "gray", fontSize: "14px" }}>{post.content}</div>
                  <TimeLocationWrapper>
                    <div id="time" style={{ color: "gray", fontSize: "14px" }}>거래 가능 시간: {post.startTimeString} - {post.endTimeString}</div>
                    <div id="address" style={{ color: "gray", fontSize: "14px" }}>거래 장소: {post.address.name}</div>
                  </TimeLocationWrapper>
                  <div id="price" style={{ fontWeight: "800", fontSize: "16px" }}>{post.price}원</div>
                </TextContent>
                <RainWrapper>
                  <FontAwesomeIcon icon={faDroplet} style={{ color: "#74C0FC", fontSize: "32px" }} />
                  {/* <FontAwesomeIcon icon={faDroplet} style={{ color: "blue", fontSize: "24px" }} /> */}
                  <div id="expectedRain" style={{ color: "gray", fontSize: "14px", marginTop: "4px" }}>{post.expectedRain}mm</div>
                </RainWrapper>
              </TextBox>

            </Post>
          ))}
          {/* <Post id="sample" onClick={onPostClick}>
            <ImgBox><img src="https://via.placeholder.com/110" alt="Example" /></ImgBox>
            <TextBox>
              <div id="title">샘플입니다</div>
              <div id="time" style={{ color: "gray", fontSize: "16px" }}>2024-05-27</div>
              <br />
              <div id="price" style={{ fontWeight: "800" }}>1억원</div>
            </TextBox>
          </Post> */}
        </PostList>

        <PostBtn onClick={() => navigate("/market/posting")}>
          <Btn>
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: "4px" }} />
            <div style={{ paddingTop: "2px" }}>글쓰기</div>
          </Btn>
        </PostBtn>
      </ListBox>
    </Wrapper>
  );
}

export default Board

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  background-color: whitesmoke;
  display: block;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const TopBar = styled.div`
  width: 100%;
  height: 70px;
  padding: 0px 30px;
  display: flex;
  justify-content: start;
  align-items: center;
  font-weight: 800;
  font-size: 22px;
  position: sticky;
  /* background-color: #70ccfed2; */
  /* background-color: #D1EDFF; */
  /* background-color: #FFCE1F; */
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.15);


`;

const RefreshBtn = styled(motion.div)`
  margin-left: 7px;
  cursor: pointer;
`;

const PostList = styled.div`
  width: 100%;  
  height: 100%;
  padding: 20px;
  display: block;
  justify-content: center;
  align-items: center;
  text-align: left;
`;

const Post = styled.div`
  width: 100%;
  min-height: 150px;
  height: 150px;
  display: flex;
  justify-content: start;
  align-items: top;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: background-color 0.4s ease;
  &:hover {
    background-color: #EEF9FE;
  }
`;

const ImgBox = styled.div`
  width: 110px;
  height: 110px;
  min-width: 110px;
  padding-right: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    width: 110px;
    height: 110px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); // 예시로 그림자 효과 추가
  }
`;

const TextBox = styled.div`
  // width: 70%;
  // height: 100%;
  // font-weight: 500;
  // font-size: 18px;
  // flex-direction: column; // 추가
  // justify-content: space-between; // 추가
  width: calc(100% - 110px - 40px); // 추가: 이미지 박스와 여백을 제외한 나머지 너비
  display: flex;
  justify-content: space-between; // 변경: 두 개의 자식 요소를 양쪽 끝으로 정렬
  align-items: center; // 추가: 수직 정렬
`;

const TextContent = styled.div`
  width: calc(100% - 60px); // 추가: 강수량 박스를 제외한 너비
  height: 100%;
  font-weight: 500;
  font-size: 18px;
  flex-direction: column; // 추가
  justify-content: space-between; // 추가
`;

const TimeLocationWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
`;

const RainWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end; // 변경: 우측 정렬을 위한 스타일
`;


const ChatBtn = styled.div`
  display: flex;
  justify-content: end;
  background-color: tomato;
  div {
    margin-left: 6px;
  }
`;

const ListBox = styled.div`
  width: 100%;
  height: 92%;
  max-height: 92%;
  overflow-y: scroll;
  background-color: white;
`;

const PostBtn = styled.div`
  z-index: 100;
  width: 100%;
  height: 50px;
  padding: 0px 20px;
  font-weight: 700;
  font-size: 18px;
  color: white;
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  justify-content: end;
  cursor: pointer;
`;

const Btn = styled.div`
  width: 110px;
  min-width: 110px;
  height: 100%;
  padding: 20px;
  background-color: #003E5E;
  /* background-color: #FFCE1F; */
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  box-shadow: 0px 0px 7px 3px rgba(0, 0, 0, 0.1);
`;

// function Board() {
//   const [isRotating, setIsRotating] = useState(false);
//   const [posts, setPosts] = useState([]);
//   const [editPost, setEditPost] = useState(null);

//   const curAddr = useRecoilValue(currentAddressState);
//   const setNav = useSetRecoilState(navState);
//   setNav("market");

//   const navigate = useNavigate();

//   //게시물 가져오기
//   useEffect(() => {
//     fetchPosts();
//   }, []);

//   const fetchPosts = async () => {
//     try {
//       const response = await axios.get(apiUrl);
//       setPosts(response.data);
//     } catch (error) {
//       console.error("Error fetching posts", error);
//     }
//   };

//   const addPost = async (post) => {
//     try {
//       const response = await axios.post(apiUrl, post);
//       setPosts([...posts, response.data]);
//     } catch (error) {
//       console.error("Error adding post", error);
//     }
//   };

//   const onPostClick = (boardId) => {
//     navigate(`/market/post/${boardId}`);
//   };

//   useEffect(() => {
//     if (isRotating) {
//       const timeout = setTimeout(() => {
//         setIsRotating(false);
//       }, 1000); // 애니메이션 지속 시간 후 상태를 false로 변경
//       return () => clearTimeout(timeout);
//     }
//   }, [isRotating]);

//   const handleRefreshClick = () => {
//     //현재 위치 재탐색
//     //재탐색한 위치에 해당하는 게시글 목록 다시 불러와야 함
//     setIsRotating(true);
//   };

//   return (
//     <Wrapper>
//       <TopBar id="location">
//         <div>{curAddr.depth3 || "현재 위치"}</div>
//         <RefreshBtn
//           onClick={handleRefreshClick}
//           animate={{ rotate: isRotating ? 320 : 10 }}
//           transition={{ duration: 0.8 }}
//         >
//           <FontAwesomeIcon icon={faRotateRight} />
//         </RefreshBtn>
//       </TopBar>
//       <ListBox>
//         <PostList>
//           {posts.map((post) => (
//             <Post key={post.id} onClick={() => onPostClick(post.boardId)}>
//               <ImgBox><img src={post.img} alt="Example" /></ImgBox>
//               <TextBox>
//                 <div id="title">{post.title}</div>
//                 <div id="time" style={{ color: "gray", fontSize: "16px" }}>{post.date}</div>
//                 <br />
//                 <div id="price" style={{ fontWeight: "800" }}>{post.price}</div>
//               </TextBox>
//             </Post>
//           ))}
//           <Post id="sample" onClick={onPostClick}>
//             <ImgBox><img src="https://via.placeholder.com/110" alt="Example" /></ImgBox>
//             <TextBox>
//               <div id="title">샘플입니다</div>
//               <div id="time" style={{ color: "gray", fontSize: "16px" }}>2024-05-27</div>
//               <br />
//               <div id="price" style={{ fontWeight: "800" }}>1억원</div>
//             </TextBox>
//           </Post>
//         </PostList>

//         <PostBtn onClick={() => navigate("/market/posting")}>
//           <Btn>
//             <FontAwesomeIcon icon={faPlus} style={{ marginRight: "4px" }} />
//             <div style={{ paddingTop: "2px" }}>글쓰기</div>
//           </Btn>
//         </PostBtn>
//       </ListBox>
//     </Wrapper>
//   );
// }

// export default Board
