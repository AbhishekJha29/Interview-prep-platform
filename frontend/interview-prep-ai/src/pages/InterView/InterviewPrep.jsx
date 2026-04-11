import React, { useEffect, useState } from 'react'
import {useParams, useNavigate} from "react-router-dom";
import moment from "moment";
import {AnimatePresence, motion} from "framer-motion";
import { LuCircleAlert, LuListCollapse, LuArrowLeft} from "react-icons/lu";
import SpinnerLoader from "../../components/Loader/SpinnerLoader";
import {toast} from "react-hot-toast";
import RoleInfoHeader from './components/RoleInfoHeader';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/appPaths';
import QuestionCard from '../../components/Cards/QuestionCard';
import AIResponsePreview from './components/AIResponsePreview';
import Drawer from '../../components/Drawer';
import SkeletonLoader from '../../components/Loader/SkeletonLoader';


const InterviewPrep = () => {
  const {sessionId} = useParams();
  const navigate = useNavigate();

  const [ sessionData, setSessionData] = useState(null);
  const [errorMsg, setErrorMsg]  = useState("");
  const [openLeanMoreDrawer, setOpenLeanMoreDrawer] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdateLoader, setIsUpdateLoader] = useState(false);

  const fetchSessionDetailsById = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.SESSION.GET_ONE(sessionId)
      );

      if (response.data && response.data.session) {
        setSessionData(response.data.session);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const generateConceptExplanation = async (question) => {
    try {
      setErrorMsg("");
      setExplanation(null)

      setIsLoading(true);
      setOpenLeanMoreDrawer(true);

      const response = await axiosInstance.post(
        API_PATHS.AI.GENERATE_EXPLANATIONS,
        {
          question,
        }
      );

      if (response.data) {
        setExplanation(response.data)
      }
    } catch (error) {
      setExplanation(null);
      setErrorMsg("Failed to generate explanation, try again later");
      console.error("Error:", error);
    }finally{
      setIsLoading(false);
    }
  };

  const toggleQuestionPinStatus = async (questionId) => {
       try {
        const response = await axiosInstance.post(
          API_PATHS.QUESTION.PIN(questionId)
        );
        console.log(response)
        if (response.data && response.data.question) {
          fetchSessionDetailsById();
        }
       } catch (error) {
        console.error("Error:", error);
       }
  };

  const uploadMoreQuestions = async () => {
    try {
      setIsUpdateLoader(true);
      const aiResponse = await axiosInstance.post(
        API_PATHS.AI.GENERATE_QUESTIONS,
        {
          role: sessionData?.role,
          experience: sessionData?.experience,
          topicsToFocus: sessionData?.topicsToFocus,
          numberOfQuestions: 10,
        }
      );
      const generatedQuestions = aiResponse.data;
      const response = await axiosInstance.post(
        API_PATHS.QUESTION.ADD_TO_SESSION,
        {
          sessionId,
          questions: generatedQuestions,
        }
      );

      if (response.data) {
        toast.success("Added More Q&A!!");
        fetchSessionDetailsById();
      }
    } catch (error) {
      if (error.response && error.response.data.message) {
        setError(error.response.data.message);
      }else{
        setError("Something went wrong. Please try again.");
      }
    }finally{
      setIsUpdateLoader(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetailsById();
    }

    return () => {};
  }, []);

  return (
    <DashboardLayout activeMenu="dashboard">
      <div className='bg-white'>
        <div className='container mx-auto py-2 px-4 md:px-0'>
          <button
            onClick={() => navigate("/dashboard")}
            className='flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors mb-2 cursor-pointer'
          >
            <LuArrowLeft className='text-lg' />
            Back to Dashboard
          </button>
        </div>
      </div>

      <RoleInfoHeader
        role={sessionData?.role || ""}
        topicsToFocus={sessionData?.topicsToFocus || ""}
        experience={sessionData?.experience || "-"}
        questions={sessionData?.questions?.length || "-"}
        description={sessionData?.description || ""}
        lastUpdated={
          sessionData?.updatedAt
          ? moment(sessionData.updatedAt).format("Do MMM YYYY")
          :""
        }
      />

      <div className='container mx-auto pt-4 pb-4 px-4 md:px-0'>
        <h2 className='text-lg font-semibold color-black'>Interview Q & A</h2>

        <div className='grid grid-cols-12 gap-4 mt-5 mb-10'>
          <div className={`col-span-12 ${
            openLeanMoreDrawer ? "md:col-span-7" : "col-span-8"
          }`}>
            <AnimatePresence>
              {sessionData?.questions?.map((data, index) => {
                return (
                  <motion.div
                  key={data._id || index}
                  initial={{opacity: 0, y: -20}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, scale: 0.95}}
                  transition={{
                    duration: 0.4,
                    type: "spring",
                    stiffness: 100,
                    delay: index * 0.1,
                    damping: 15,
                  }}
                  layout
                  layoutId={`question-${data._id || index}`}>
                    <>
                    <QuestionCard
                    question={data?.question}
                    answer={data?.answer}
                    onLearnMore={() => generateConceptExplanation(data.question)}
                    isPinned={data?.isPinned}
                    onTogglePin={() => toggleQuestionPinStatus(data._id)}/>
                    {!isLoading && 
                    sessionData?.questions?.length == index + 1 && (
                      <div className='flex items-center justify-center mt-5'>
                        <button
                        className='flex items-center gap-3 text-sm text-white font-medium bg-black px-5 py-2 mr-2 rounded text-nowrap cursor-pointer'
                        disabled={isLoading || isUpdateLoader}
                        onClick={uploadMoreQuestions}>
                          {isUpdateLoader ? (
                            <SpinnerLoader/>
                          ) : (
                            <LuListCollapse className='text-lg'/>
                          )}{" "}
                          Load More
                        </button>
                      </div>
                    )}
                    </>
                  </motion.div>
                );
              })}
              </AnimatePresence>
              </div>
        </div>

        <div>
          <Drawer 
          isOpen={openLeanMoreDrawer}
          onClose={() => setOpenLeanMoreDrawer(false)}
          title={!isLoading && explanation?.title}>
            {errorMsg && (
              <p className='flex gap-2 text-sm text-amber-600 font-medium'>
                <LuCircleAlert className='mt-1'/> {errorMsg}
              </p>
            )}
            {isLoading && <SkeletonLoader/>}
            {!isLoading && explanation && (
              <AIResponsePreview content={explanation?.explanation}/>
            )}
          </Drawer>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default InterviewPrep
