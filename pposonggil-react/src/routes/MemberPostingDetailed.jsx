import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleUser, faWonSign, faTemperatureHalf } from "@fortawesome/free-solid-svg-icons";
import { useSetRecoilState } from "recoil";
import { navState } from "../recoil/atoms";

// JSON 서버 API URL, 백이랑 연동 시 수정 필요
const apiUrl = "http://localhost:3001/postList";


function MemberPostingDetailed() {
    // const { postId } = useParams();
    const { boardId } = useParams();
    const [post, setPost] = useState(null);
    const navigate = useNavigate();

    const setNav = useSetRecoilState(navState);
    setNav("market");

    useEffect(() => {
        const fetchPost = async () => {
            try {
                //const response = await axios.get(`${apiUrl}`);
                const response = await axios.get(apiUrl);
                // const postList = response.data; 백엔드 코드 합치면
                const postList = response.data;
                const foundPost = postList.find((item) => item.boardId.toString() === boardId);
                if (foundPost) {
                    setPost(foundPost);
                } else {
                    console.error(`Post with id ${boardId} not found.`);
                }
            } catch (error) {
                console.error("Error fetching post", error);
            }
        };

        fetchPost();
    }, [boardId]);

    // const handleEdit = () => {
    //     navigate(`/market/edit-post/${postId}`); // 기존의 수정 버튼 핸들러가 수정 페이지로 이동하도록 변경
    // };

    const handleEdit = () => {
        navigate(`/market/edit-post/${boardId}`, { state: { post } });
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`${apiUrl}/${boardId}`);
            navigate("/member-posting");
        } catch (error) {
            console.error("Error deleting post", error);
        }
    };

    if (!post) return <div>Loading...</div>;

    return (
        <React.Fragment>
            <Wrapper>
                <ImgBox>
                    <img src={post.img} alt={post.title} />
                </ImgBox>
                <AuthorBox>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <div id="profileImg">
                            <FontAwesomeIcon icon={faCircleUser} style={{ color: "gray", fontSize: "35px" }} />
                        </div>
                        <div id="name">{post.author}</div>
                    </div>
                    <div id="rating">
                        <span style={{ color: "orange" }}>4.5</span>
                        <FontAwesomeIcon icon={faTemperatureHalf} style={{ color: "tomato", marginRight: "0" }} />
                    </div>
                </AuthorBox>
                <DetailBox>
                    <Title>{post.title}</Title>
                    <Date>{post.date}</Date>
                    <br />
                    <Content>{post.content}</Content>
                </DetailBox>
                <BottomBar>
                    <Price>
                        <FontAwesomeIcon icon={faWonSign} />
                        <div>{post.price}원</div>
                    </Price>
                    <Button onClick={handleEdit}>게시글 수정하기</Button>
                    <Button onClick={handleDelete}>게시글 삭제하기</Button>
                </BottomBar>
            </Wrapper>
        </React.Fragment>
    );
}

export default MemberPostingDetailed;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  position: relative;
`;
const Box = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
`;

const ImgBox = styled(Box)`
  height: 40%;
  background-color: whitesmoke;
  justify-content: center;
  z-index: 5;
  img {
    padding: 0px 80px;
    height: 100%;
    width: 100%;
  }
`;

const DetailBox = styled(Box)`
  height: auto;
  align-items: start;
  display: block;
  padding: 30px;
`;

const BottomBar = styled.div`
  width: 100%;
  height: 100px;
  padding: 0px 30px;
  position: absolute;
  bottom: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.1);  
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 22px;
  font-weight: 700;
`;

const Price = styled.div`
  display: flex;
  * {
    margin-right: 20px;
  }
`;

const Button = styled.button`
  font-size: 18px;
  color: white;
  padding: 15px 20px;
  background-color: #00b3fff5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-left: 10px;
  &:hover {
    background-color: #007bbf;
  }
`;

const AuthorBox = styled(Box)`
  height: 80px;
  justify-content: space-between;
  padding: 30px;
  font-size: 25px;
  font-weight: 700;
  text-align: center;
  border-bottom: 2px solid rgba(0,0,0,0.1);
  box-shadow: inset 0px 6px 13px rgba(0, 0, 0, 0.1);
  * {
    margin-right: 8px;
  }
`;

const Title = styled.div`
  font-weight: 700;
  font-size: 22px;
  margin-bottom: 5px;
`

const Date = styled.div`
  font-weight: 400;
  font-size: 18px;
  color: gray;
`;

const Content = styled.div`
  font-weight: 400; 
  font-size: 19px;
`;
