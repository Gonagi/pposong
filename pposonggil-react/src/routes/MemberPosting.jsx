import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const Container = styled.div`
  width: 100%;
  padding: 20px;
  background-color: #f9f9f9;
`;

const PostList = styled.div`
  display: flex;
  flex-direction: column;
`;

const Post = styled.div`
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #ddd;
  background-color: #fff;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #f1f1f1;
  }
`;

const PostImage = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
  margin-right: 15px;
`;


const PostDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const PostTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #333;
`;

const PostContent = styled.p`
  margin: 5px 0 0;
  font-size: 14px;
  color: #777;
`;

const PostPrice = styled.span`
  margin-top: 5px;
  font-size: 16px;
  font-weight: bold;
  color: #333;
`;


function MemberPosting() {
    const [posts, setPosts] = useState([]);
    const navigate = useNavigate();
    // const { writerId } = useParams();

    useEffect(() => {
        // Replace '1' with the actual writer ID dynamically if needed
        axios.get('http://localhost:3001/postList?writerId=1')//나중에 백엔드 url로 변경
            //'http://localhost:8080/api/boards/by-member/${writerId}'
            .then(response => {
                setPosts(response.data);
            })
            .catch(error => {
                console.error('Error fetching posts:', error);
            });
    }, []);

    const handlePostClick = (boardId) => {
        navigate(`/member-posting/post/${boardId}`);
    };


    return (
        <Container>
            {posts.length === 0 ? (
                <p>No posts found.</p>
            ) : (
                <PostList>
                    {posts.map(post => (
                        <Post key={post.boardId} onClick={() => handlePostClick(post.boardId)}>
                            {/* 사진 url 나중에 제대로 바꾸기 */}
                            {/* <PostImage src={post.img || "https://via.placeholder.com/80"} alt={post.title} /> */}
                            <PostImage src={post.img.startsWith('blob:') ? "https://via.placeholder.com/80" : post.img} alt={post.title} />
                            <PostDetails>
                                <PostTitle>{post.title}</PostTitle>
                                <PostContent>{post.content}</PostContent>
                                <PostPrice>{post.price}원</PostPrice>
                            </PostDetails>
                        </Post>
                    ))}
                </PostList>
            )}
        </Container>
    );
}

export default MemberPosting;