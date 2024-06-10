import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useRecoilState, useSetRecoilState } from 'recoil';
import { addressState, currentAddressState, markerState, navState, routeInfoState, userState } from '../recoil/atoms';
import axios from "axios";

import styled from "styled-components";
import { motion, sync } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBus, faSubway, faDroplet, faCircleDot, faPersonWalking, faLocationDot, faWind, faGlassWaterDroplet, faCloudRain, faSun, faCloud, faDisplay, faRoute, faFlag, faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";

import MapBtn from "../components/MapBtn";

const { kakao } = window;

function TransactionStatus() {
  const setNav = useSetRecoilState(navState);
  const [map, setMap] = useState(null);
  const [infoWindow, setInfoWindow] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const mapInstance = useRef(null);
  /*  여기서부터 MapBtn 컴포넌트 관련 */
  const markerInstance = useRef(null);
  const geocoder = useRef(null);

  const hasCurrentAddressBeenSet = useRef(false); //
  const [currentAddress, setCurrentAddress] = useRecoilState(currentAddressState); // 현재 위치 추적 주소
  const [activeMarker, setActiveMarker] = useRecoilState(markerState);

  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [activeTracking, setActiveTracking] = useState(false);

  const [initialPosition, setInitialPosition] = useState({}); // 페이지 처음 렌딩할 때 현위치 정보 저장

  const [isGridLoading, setIsGridLoading] = useState(false); // 그리드 버튼 로딩 상태
  const [isGridActive, setIsGridActive] = useState(false); // 그리드 활성화 상태
  const [gridObjects, setGridObjects] = useState([]); // 기본 그리드, (29개 격자, 반투명 fillcolor)
  const [gridWeather, setGridWeather] = useState([]); // 서버로부터 격자당 시간별 강수 정보 받아온 데이터 저장

  // 그리드 경계 데이터
  const latLine = [37.69173846, 37.64577895, 37.60262058, 37.55674696, 37.51063517, 37.46494092, 37.42198141];
  const lonLine = [126.7851093, 126.8432583, 126.9010823, 126.9599082, 127.0180783, 127.0766389, 127.1340031, 127.1921521];
  const gridBounds = [];

   // 그리드 경계 좌표 생성
  for (let latIdx = 1; latIdx < latLine.length; latIdx++) {
    for (let lonIdx = 0; lonIdx < lonLine.length - 1; lonIdx++) {
      if (latIdx === 1 && lonIdx !== 4 && lonIdx !== 5) continue;
      if (latIdx === 2 && lonIdx !== 2 && lonIdx !== 3 && lonIdx !== 4 && lonIdx !== 5) continue;
      if (latIdx === 6 && lonIdx !== 1 && lonIdx !== 2 && lonIdx !== 4) continue;

      const sw = new kakao.maps.LatLng(latLine[latIdx - 1], lonLine[lonIdx]);
      const ne = new kakao.maps.LatLng(latLine[latIdx], lonLine[lonIdx + 1]);
      gridBounds.push(new kakao.maps.LatLngBounds(sw, ne));
    }
  }

  // 격자 지도 위에 그리고 기본값으로 세팅
  const showGrid = useCallback(() => {
    const newGridObjects = gridBounds.map(bounds => {
      const rectangle = new kakao.maps.Rectangle({
        bounds: bounds,
        strokeWeight: 2,
        strokeColor: '#004c80',
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
        fillColor: '#ffffff',
        fillOpacity: 0.5,
      });
      rectangle.setMap(mapInstance.current);
      return rectangle;
    });
    setGridObjects(newGridObjects);  // 그리드 객체 상태 업데이트
  }, [gridBounds]);

  const getGridWeatherFromServer = async () => { //격자 구간별 날씨 정보 get
    const url = 'http://localhost:8080/api/forecasts';
    try {
      const response = await axios.get(url);
      setGridWeather(response.data);
    } catch(error) {
      console.error("격자 날씨 정보 get 에러", error);
    }
  };

  useEffect(() => { //그리드객체 showGrid로 업데이트 된 후에 적용되게 하기 위해서 useEffect 사용
    if (isGridActive && gridObjects.length > 0) {
      handleTimeBtn(0);
    }
  }, [gridObjects, isGridActive]);
  
  const handleGridBtn = useCallback(() => { //그리드 버튼 클릭 핸들러
    if (isGridActive) {
      gridObjects.forEach(rectangle => rectangle.setMap(null));
      setGridObjects([]);
    } else {
      showGrid();
    }
    setIsGridActive(!isGridActive);
  }, [isGridActive, gridObjects, showGrid]);
  
  const handleTimeBtn = (index) => { //클릭한 격자의 강수량 정보로 fillcolor 변경
    // index에 해당하는 키 가져옴(키값: 시간대)
    const Key = Object.keys(gridWeather)[index];
    // 키에 해당하는 배열. (총 30개 구간)
    const Array = gridWeather[Key]; 
    // 각 격자에 대해 강수량 반영 격자 색상 변경
    gridObjects.forEach((rectangle, _index) => {
      const item = Array[_index];
      const gridData = item.rn1;
      let fillColor = '#ffffff';
  
      if (gridData) {
        const rain = parseFloat(gridData);
        if (rain >= 0 && rain <=  10) {
          fillColor = 'rgba(255, 255, 255, 0.64)';
        } else if (rain > 10 && rain <= 15) {
          fillColor = 'rgba(77, 216, 255, 0.5)';
        } else if (rain > 15 && rain <= 20) {
          fillColor = 'rgba(0, 130, 255, 0.5)';
          // fillColor = 'rgba(0, 106, 255, 0.5)';
        } else if (rain > 25 && rain <= 30) {
          fillColor = 'rgba(0, 98, 255, 0.5)';
        } else if (rain > 30 && rain <= 35){
          fillColor = 'rgba(0, 59, 197, 0.5)';
        } else if (rain > 35 && rain <= 40) {
        } else {
          fillColor = 'rgba(3, 0, 197, 0.5)';
          console.log("남색으로 설정");
        }
      }
      rectangle.setOptions({
        fillColor,
      });
    });
  };
  
  const handleLocationBtn = useCallback(() => {//위치 추적 버튼 핸들러
    setIsLocationLoading(true);
    if (!activeTracking) { 
      if (navigator.geolocation) {
        // 현재 위치 추적 및 지도 확대/이동
        navigator.geolocation.getCurrentPosition((position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const curPosition = new kakao.maps.LatLng(lat, lon);

          mapInstance.current.setCenter(curPosition);
          mapInstance.current.setLevel(3);
          setActiveTracking(true);

          // 좌표를 주소로 변환
          //현재 위치 주소 정보 currentAddress atom에 저장
          geocoder.current.coord2Address(lon, lat, (result, status) => {
            if (status === kakao.maps.services.Status.OK) {
              setCurrentAddress({
                depth2: result[0].address.region_2depth_name,
                depth3: result[0].address.region_3depth_name,
                addr: result[0].address.address_name,
                roadAddr: result[0].road_address.address_name,
                lat: lat,
                lon: lon,
              });
            }
          });
          
          //마커 업데이트
          if (!markerInstance.current) {
            markerInstance.current = new kakao.maps.Marker({
              position: curPosition,
              map: mapInstance.current,
            });
          } else {
            markerInstance.current.setPosition(curPosition);
            markerInstance.current.setMap(mapInstance.current);
          }
          setActiveMarker(true);
          setIsLocationLoading(false);
        }, () => {
          alert('위치를 가져올 수 없습니다.');
          setIsLocationLoading(false);
        });
      } else {
        alert('Geolocation을 사용할 수 없습니다.');
        setIsLocationLoading(false);
      }
    } else {
      if (markerInstance.current) { //마커 있으면 제거
        markerInstance.current.setMap(null);
      }
      setActiveTracking(false);// 위치 추적 상태 비활성화로 atom 업데이트
      setActiveMarker(false); //마커 상태 비활성화로 atom 업데이트
      setIsLocationLoading(false);
    }
  }, [activeTracking]);

  /* 지도 생성 */
  useEffect(() => {
    setNav("mypage");
    console.log("전달받은 transaction: ", transaction);
    getGridWeatherFromServer();
    getCurrentAddress();
    // onUpdateBtnClick();
    kakao.maps.load(() => {
      const container = mapInstance.current;
      const options = {
        center: new kakao.maps.LatLng(37.5642135, 127.0016985),
        level: 4,
      };
      mapInstance.current = new kakao.maps.Map(container, options);
      geocoder.current = new kakao.maps.services.Geocoder();
      setMap(mapInstance.current);
      /* 거래 장소로 마크업 및 지도 확대 */
      markTradePlace();
      
      console.log("지도 랜더링");
    });
  }, []);

  // 거래장소로 지도 마크업
  const markTradePlace = () => {
     /* 거래 장소로 마크업 및 지도 확대 */
     console.log("거래정보: ",transaction);
     const latitude = transaction.address.latitude; 
     const longitude = transaction.address.longitude;
     const markerPosition = new kakao.maps.LatLng(latitude, longitude); // Example coordinates
     const marker = new kakao.maps.Marker({
       position: markerPosition
     });
     marker.setMap(mapInstance.current);
     // 지도 확대 및 이동
     mapInstance.current.setCenter(markerPosition);
     mapInstance.current.setLevel(3); // 1 being the most zoomed-in level, adjust as needed
  };

  // useEffect(()=> {

  // }, []);

  // currentAddress가 처음 설정된 경우에만 함수를 실행 => useRef 사용해서 처음 한 번만 PUT 요청이 자동으로 보내지게 함
  useEffect(() => {
    if (currentAddress.lat && !hasCurrentAddressBeenSet.current) {
      onUpdateBtnClick();
      hasCurrentAddressBeenSet.current = true;
    }
  }, [currentAddress]);
  /* 6월 9일 오전 6시 추가 */
  // 거래장소 임의로 설정해놓고 코드 작성, 후에 서버측에서 정보 가져와서 바꿔줘야함
  const location = useLocation();
  const { transaction } = location.state || [];
  const navigate = useNavigate();
  const [tsData, setTsData] = useState([]); //서버로부터 받을 response.data 저장
  const [user, setUser] = useRecoilState(userState);
  const [remainingTime, setRemainingTime] = useState({
    hrs: 0,
    mins: 0
  });
  const [routeInfo, setRouteInfo] = useRecoilState(routeInfoState); //경로 찾기시 출발지 목적지 저장 atom

  // 현재 위치 추적
  const getCurrentAddress = () => {
    if (navigator.geolocation) {
     
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude; //float타입으로 반환해줌
        const lon = position.coords.longitude; 
        const curPosition = new kakao.maps.LatLng(lat, lon);
        
        // 좌표를 주소로 변환 + 현재 위치 주소 정보로 currentAddress atom값 업데이트
        geocoder.current.coord2Address(lon, lat, (result, status) => {
          if (status === kakao.maps.services.Status.OK) {
            //첫 위치 추적(페이지 첫 렌더링 시)시 initialPosition에 저장
            if(!initialPosition) {
              setInitialPosition({
                lat: lat,
                lon: lon,
              })
            }
            setCurrentAddress({
              depth2: result[0].address.region_2depth_name,
              depth3: result[0].address.region_3depth_name,
              addr: result[0].address.address_name,
              roadAddr: result[0].road_address.address_name,
              lat: lat,
              lon: lon,
            });
          }
        });
      });
    }
    console.log("현재 위치를 업데이트 했습니다");    
  };

  //거래까지 남은 시간 계산 함수
  const calculateTimeRemaining = () => {
    const tsStartTimeString = transaction.startTimeString; // 거래 시작 시간
    const currentTime = new Date(); // 현재 시간
    // 년, 월, 일, 시, 분 분리
    const [year, month, day, hour, minute] = tsStartTimeString.split(/[-:]/);
    const tsStartTime = new Date(year, month - 1, day, hour, minute);
    
    // 시간 차이 계산 (밀리초 단위)
    const timeDifference = tsStartTime - currentTime;
    if (timeDifference <= 0) {
      setRemainingTime({
        hrs: 0,
        mins: 0
      });
      return;
    }

    // 밀리초를 시간과 분으로 변환
    const remainingHours = Math.floor(timeDifference / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

    console.log(`남은 시간: ${remainingHours}시간 ${remainingMinutes}분`);
    setRemainingTime({
      hrs: remainingHours,
      mins: remainingMinutes
    });
  }
  //거래까지 남은 시간 계산 함수 1분마다 실행
  useEffect(() => {
    console.log("거래까지 남은 시간을 계산합니다.");
    calculateTimeRemaining(); // 초기 호출
  
    // 1분 간격으로 호출하는 Interval 설정
    const intervalId = setInterval(() => {
      calculateTimeRemaining();
    }, 60000); // 1분은 60초이므로 60000밀리초
  
    // 컴포넌트가 언마운트되거나 업데이트되면 Interval 정리
    return () => clearInterval(intervalId);
  }, []);

  //현재 위치에서 거래장소까지의 경로 검색 버튼
  const onSearchBtnClick = () => {
    console.log("현재 위치: ", currentAddress);
    //현재 위치 (recoilState이용) 출발지, 거래장소 도착지로 routeInfoState atom값 설정한 후 serach/routes 페이지로 이동
    if(currentAddress.addr) {
      const searchOrigin = {
        name: currentAddress.addr,
        lat: currentAddress.lat,
        lon: currentAddress.lon,
      };
      // const searchDest = meetingPlace;
      const searchDest = {
        name: transaction.address.name,
        lat: transaction.address.latitude,
        lon: transaction.address.longitude,
      }
      setRouteInfo({
        origin: [searchOrigin],
        dest: [searchDest]
      });
      navigate('/search/routes');
    } else {
      console.log("현재 위치 값이 없습니다.");
    }
  };

  useEffect(()=> {
    console.log("routeInfoState: ", routeInfo);
  }, [routeInfo]);

  /* 서버로 내 위치 데이터, 아이디 보내고 정보 받기 */
  const sendDtosToServer = async() => {
    console.log("서버에 put");
    //url에 tradeId와 유저의 id 붙여서 보내기 //테스트용으로 일단 거래아이디로 확인해봄
    const url = `http://localhost:8080/api/distance/${transaction.tradeId}/by-member/${user.userId}`; 
    const formData = new FormData(); // form-data 객체 생성

    const startDto = {
      "latitude": parseFloat(currentAddress.lat),
      "longitude": parseFloat(currentAddress.lon),
    };
    formData.append('startDto', new Blob([JSON.stringify(startDto)], { type: 'application/json' }));
    
    // // FormData 내용 출력(프론트 확인용)
    for (let [key, value] of formData.entries()) {
      console.log("서버로 보낸 데이터: ");
      console.log(`${key}:`, value);
      if (value instanceof Blob) {
        value.text().then(text => console.log(`${key} content:`, text));
      }
    }
    
    try {
      const response = await axios.put(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Response:', response.data);
      setTsData(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  //
  const onUpdateBtnClick = () => {
    console.log('업데이트 버튼 클릭');
    getCurrentAddress(); //내위치 정보 업데이트
    //여기서 문제,, 내 위치정보는 recoilState로 저장하고 잇는데 업데이트한 위치 정보가 여기서 바로 반영이 되나..?
    // 렌더링이 한번 일어나야 값아 반영 되는 거라면, 여기서 오류날거임(현재위치 반영안되고 예전 위치나, 위치 정보 없다거나..)
    sendDtosToServer(); 
    //내위치 정보 서버에 put 하고 response.data로 화면에 뿌리기.
    //맨 처음 렌더링 될 때 내위치 따로 저장해서 비교하기. 얼마나 줄었는지.
    //내위치 정보 서버에 put 하고 response.data로 화면에 뿌리기.
  };

  // useEffect(()=> {
  //   console.log("거래 정보 서버로부터 받아 화면을 업데이트 합니다");
  // }, [tsData]);
  
  return (
    <React.Fragment>
      <MapContainer id="map" ref={mapInstance} style={{position:"relative"}}>
        <TimeBtnBar>
        {isGridActive && (
          <TimeBtns
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <TimeBtn onClick={()=>handleTimeBtn(0)}>현재</TimeBtn>
            <TimeBtn onClick={()=>handleTimeBtn(1)}>+ 1시간</TimeBtn>
            <TimeBtn onClick={()=>handleTimeBtn(2)}>+ 2시간</TimeBtn>
            <TimeBtn onClick={()=>handleTimeBtn(3)}>+ 3시간</TimeBtn>
            <TimeBtn onClick={()=>handleTimeBtn(4)}>+ 4시간</TimeBtn>
            <TimeBtn onClick={()=>handleTimeBtn(5)}>+ 5시간</TimeBtn>
          </TimeBtns>
         )}
        </TimeBtnBar>
        <MapBtn
          isGridActive={isGridActive}
          isGridLoading={isGridLoading}
          isLocationLoading={isLocationLoading}
          activeTracking={activeTracking}
          handleGridBtn={handleGridBtn}
          handleLocationBtn={handleLocationBtn}
        />
      </MapContainer>
      <SearchRouteBtn
          initial={{ height: "20%" }}
          animate={{ height: isExpanded ? "20%" : "20%" }}
          transition={{ duration: 0.4 }}
          >
              <RouteBtn onClick={()=>onSearchBtnClick()}>
                <FontAwesomeIcon icon={faRoute} style={{color: "#13C87C", paddingRight: "8px"}}/>
                <p>경로 안내</p>
              </RouteBtn>
      </SearchRouteBtn>
      <BottomContainer
        initial={{ height: "50%" }}
        animate={{ height: isExpanded ? "50%" : "50%" }}
        transition={{ duration: 0.4 }}
        // onClick={() => setIsExpanded(!isExpanded)}
      >

        <ToggleBar><TBar /></ToggleBar>
        <TransactionBox>
          <Block>
            <BlockColumnL>
              <div>
                <h1>거래 시간이<br />다가오고 있어요<br /></h1>
                <p>서둘러 약속 장소로 이동해주세요!</p>
              </div>
            </BlockColumnL>
            <BlockColumnR>
              <Text>
                <h2>남은시간</h2>
                <h1>{remainingTime.hrs}<p>시간</p></h1>
                <h1>{remainingTime.mins}<p>분</p></h1>
              </Text>
            </BlockColumnR>
          </Block>
          <Block>
            <BlockColumnL>
              <div>
                <FontAwesomeIcon icon={faFlag} style={{fontSize: "18px", paddingRight: "5px"}}/>
                <span>{transaction.address.name}</span>
                <p style={{fontSize: "16px", fontWeight: "500", color: "#656565"}}>
                  {transaction.address.street}
                </p>
              </div>
            </BlockColumnL>
          </Block>

          {/* 거래 진행 상황 상태 바 */}
          <RefreshBlock>
            <RefreshIcon onClick={()=> onUpdateBtnClick()}>
              위치 업데이트<FontAwesomeIcon icon={faArrowRotateRight} style={{marginLeft: "5px"}} />
            </RefreshIcon>
          </RefreshBlock>

          {/* <div 
          style={{width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px"}}
          > 
            <span style={{width: "50%", textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>200m</span>
            <span style={{width: "50%", textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>200m</span>
          </div> */}

          <StatusBar id="StatusBar">
            
            <BarContainer style={{justifyContent: "space-between"}}>
              <Bar style={{width: "50%", backgroundColor: "#E6E6E6", justifyContent:"start"}}>
                {/* 나의 위치 상태 바 */}
                {tsData.subjectId === user.userId ? (
                  <Bar style={{width: "{tsData.subjectRemainRate}%", backgroundColor: "#63CAFF", justifyContent:"end"}}>
                    <IconBox>
                      <FontAwesomeIcon icon={faPersonWalking} style={{color: "white"}} />
                    </IconBox>
                  </Bar>
                ) : (
                  <Bar style={{width: "{tsData.objectRemainRate}%", backgroundColor: "#63CAFF", justifyContent:"end"}}>
                    <IconBox>
                      <FontAwesomeIcon icon={faPersonWalking} style={{color: "white"}} />
                    </IconBox>
                  </Bar>
                )}
              </Bar>  
              <DestIconBox><FontAwesomeIcon icon={faFlag}/></DestIconBox>
              {/* 상대방 위치 상태 바 */}
              <Bar style={{width: "50%", backgroundColor: "#E6E6E6", justifyContent: "end"}}>
                {tsData.subjectId === user.userId ? (
                <Bar style={{width: "{tsData.objectRemainRate}%", backgroundColor: "#FFCE1F"}}>
                  <IconBox>
                    <FontAwesomeIcon icon={faPersonWalking} style={{color: "white"}} />
                  </IconBox>
                </Bar>
                ) : (
                  <Bar style={{width: "{tsData.subjectRemainRate}%", backgroundColor: "#FFCE1F", justifyContent:"end"}}>
                    <IconBox>
                      <FontAwesomeIcon icon={faPersonWalking} style={{color: "white"}} />
                    </IconBox>
                  </Bar>
                )}
              </Bar>

            </BarContainer>
          </StatusBar>
              {tsData.subjectId === user.userId ? (
                <React.Fragment>
                  <StatusBarText
                   style={{display: "flex", justifyContent: "space-between", paddingBottom: "20px"}}
                  >
                    <p>{tsData.subjectName}</p>
                    <span>{transaction.address.name}</span>
                    <p>{tsData.objectName}</p>
                  </StatusBarText>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <StatusBarText
                   style={{display: "flex", justifyContent: "space-between", paddingBottom: "20px"}}
                  >
                    <p>{tsData.objectName}</p>
                    <span>{transaction.address.name}</span>
                    <p>{tsData.subjectName}</p>
                  </StatusBarText>
                  <StatusBarText></StatusBarText>
                </React.Fragment>
              )}
           
        </TransactionBox>
      </BottomContainer>
    </React.Fragment>
  );
}

export default TransactionStatus;

const MapContainer = styled(motion.div)`
  width: 100%;
  height: 50%;
  position: relative;
`;

const TimeBtnBar = styled.div`
  width: 100%;
  /* height: 40px; */
  display: flex;
  justify-content: start;
  z-index: 500;
  position: sticky;
  padding: 20px 0px;
`;
const TimeBtns = styled(motion.div)`
  padding: 0px 20px;
  * {
    margin-right: 10px;
    margin-bottom: 5px;
  }
`;
const TimeBtn = styled.button`
  font-family: 'Bagel Fat One', cursive;
  border-radius: 25px;
  border: 2px solid #424040d2;
  border: none;
  box-shadow: 0px 0px 3px 3px rgba(0, 0, 0, 0.1);
  background-color: #424040d2;
  color: white;
  padding: 5px 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  /* margin: 10px 0px; */
  &:first-child {
    border: 2px solid #003E5E;  
    background-color: #003E5E;
    color: white;
    &:hover {
      background-color: #88D6FF;
      border-color: #88D6FF;
      color: white;
    }
  }
  &:not(:first-child) {
    
    &:focus {
      background-color: #88d5ffd1;
      color: #424040;
      border: 2px solid #424040d2;
    }
    &:hover {
      background-color: #88d5ffd1;
      color: white;
    }
  }
`;

/* 하단창 */
const BottomContainer = styled(motion.div)`
  width: 100%;
  height: 50%;
  background: white;
  position: absolute;
  bottom: 0;
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  background-color: white;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
`;
// 토글 바
const ToggleBar = styled.div`
  width: 100%;
  height: 20px;
  padding: 15px 0px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: sticky;
  top:0;
  background-color: whitesmoke;
  z-index: 1000;
`;
const TBar = styled.div` //중앙 막대기
  width: 10%;
  height: 6px;
  border-radius: 25px;
  background-color: #d9d9d9;
`;
// 하단창 토글바 제외 부분(컨텐츠 들어가는 부분)
const TransactionBox = styled.div`
  background-color: white;
  padding: 20px 30px;

  margin-bottom: 10px;
`;

/* 하단창 박스 contents */
const Block = styled.div` //row기준 박스
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  &:first-child { //거래 안내 박스
    margin-bottom: 20px;
  }
  &:nth-child(2) { //거래장소 박스
    /* justify-content: start; */
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 5px;
    justify-content: space-between;
  }
`;
const RefreshBlock = styled.div`
  width: 100%;
  display: flex;
  /* justify-content: end; */
  justify-content: center;
  align-items: center;
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 20px;
`;
const RefreshIcon = styled.div`
  background-color: whitesmoke;
  font-size: 15px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 2px solid #dddddd;
  cursor: pointer;
  margin-bottom: 15px;
`;

const BlockColumnL = styled.div` //거래 안내 박스
  width: 70%;
  height: auto;
  font-weight: bold;
  display: flex;
  justify-content: start;
  div {
    display: block;
    justify-content: center;
    padding-bottom: 5px;
    height: 100%;
    h1 { //거래시간이 다가오고 있어요
      font-size: 25px;
      font-weight: 900;
    }
    p { //서둘러 약속장소로 이동해주세요
      color: #656565ea;
      font-size: 15px;
      margin-top: 4px;
    }
  }
`;
const BlockColumnR = styled.div` //시간 박스
  display: block;
  height: 90px;
  width: 90px;
  justify-content: center;
  align-items: center;
  text-align: center;
  background-color: #88d5ff79;
  border-radius: 50%;
`;

const Text = styled.div` //시간
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  h1 {
    font-weight: 900;
    font-size: 22px;
    color: #004263;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    p {
      font-size: 15px;
      font-weight: bold;
      color: black;
    }
  }
  h2 {
    font-weight: 900;
    font-size: 14px;
    color: #004263;
    margin-top: 5px;
    color: black;
  }
`;

/* 나~거래장소~거래자 거리 현황 바 */
const StatusBar = styled.div`
  padding-bottom: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10px;
`;
const IconBox = styled.div`
  min-width: 28px;
  max-width: 28px;
  min-height: 28px;
  max-height: 28px;
  border: 2px solid whitesmoke;
  background-color: inherit;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
  font-size: 13px;
  font-weight: 900;
`;
const DestIconBox = styled(IconBox)` //거래장소 아이콘
  background-color: black;
  color: #E6E6E6;
  border: none;
  z-index: 5;
`;

const StatusBarText = styled.div`
  display: flex;
  justify-content: space-between;
  padding-bottom: 20px;
  font-size: 16px;
  p {
    font-family: 'Bagel Fat One', cursive;
    font-weight: 300;
    width: 20%;
    &:last-child {
      text-align: end;
    }
  }
  span {
    width: 60%;
    color: #003E5E;
    font-weight: 900;
    text-align: center;
  }
`;

const BarContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 18px;
  background-color: #E6E6E6;
  border-radius: 25px;
`;

const Bar = styled.div`
  height: 100%;
  background-color: ${(props) => props.color};
  width: ${(props) => props.width}%;
  min-width: 14px;
  border-radius: 25px;
  position: relative;
  display: flex;
  justify-content: start;
  align-items: center;
  text-align: center;
  p {
    width: 100%;
    text-align: center;
    justify-content: center;
    font-weight: 900;
    font-size: 11px;
    color: black;
  }
`;



/* Btn 컴포넌트 추가*/
const SearchRouteBtn = styled(motion.div)`
  width: 90%;
  /* max-width: 75%; */
  height: 10%;
  height: auto;
  padding: 0px 10px;
  display: flex;
  justify-content: start;
  align-items: center;
  position: absolute;
  bottom: 44%;
  background-color: none;
  z-index: 1000;
`;
const RouteBtn = styled.button`
  width: auto;
  height: 45px;
  margin-bottom: 5px;
  border-radius: 25px;
  font-family: 'Bagel Fat One', cursive;
  font-size: 16px;
  box-shadow: 0px 0px 5px 3px rgba(0, 0, 0, 0.1);
  background-color: #003E5E;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0px 12px;
  cursor: pointer;
  &:hover {
    background-color: white;
    border: 2px solid #003E5E;
    color: #003E5E;
  }
  &:focus {
    background-color: white;
    border: 2px solid #003E5E;
    color: #003E5E;
  }
`;




