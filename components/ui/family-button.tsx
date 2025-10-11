"use client"

import { FC, ReactNode, useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const CONTAINER_SIZE = 200

interface FamilyButtonProps {
  children: React.ReactNode
}

const FamilyButton: React.FC<FamilyButtonProps> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const toggleExpand = () => setIsExpanded(!isExpanded)

  return (
    <div
      className={cn(
        "rounded-[24px] border border-amber-200/30 dark:border-amber-800/30 shadow-sm",
        "bg-gradient-to-b from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950",
        isExpanded
          ? "w-[204px]"
          : ""
      )}
    >
      <div className="rounded-[23px] border border-amber-200/20 dark:border-amber-800/20">
        <div className="rounded-[22px] border border-amber-100/30 dark:border-amber-900/30">
          <div className="rounded-[21px] border border-amber-200/10 dark:border-amber-800/10 flex items-center justify-center">
            <FamilyButtonContainer
              isExpanded={isExpanded}
              toggleExpand={toggleExpand}
            >
              {isExpanded ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: {
                      delay: 0.3,
                      duration: 0.4,
                      ease: "easeOut",
                    },
                  }}
                >
                  {children}
                </motion.div>
              ) : null}
            </FamilyButtonContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

// A container that wraps content and handles animations
interface FamilyButtonContainerProps {
  isExpanded: boolean
  toggleExpand: () => void
  children: ReactNode
}

const FamilyButtonContainer: FC<FamilyButtonContainerProps> = ({
  isExpanded,
  toggleExpand,
  children,
}) => {
  return (
    <motion.div
      className={cn(
        "relative border-amber-100/20 dark:border-amber-900/20 border shadow-lg flex flex-col space-y-1 items-center cursor-pointer z-10",
        !isExpanded
          ? "bg-gradient-to-b from-white to-amber-50 dark:from-gray-800 dark:to-amber-950/80"
          : "bg-white dark:bg-gray-900"
      )}
      layoutRoot
      layout
      initial={{ borderRadius: 21, width: "4rem", height: "4rem" }}
      animate={
        isExpanded
          ? {
              borderRadius: 20,
              width: CONTAINER_SIZE,
              height: CONTAINER_SIZE + 50,

              transition: {
                type: "spring",
                damping: 25,
                stiffness: 400,
                when: "beforeChildren",
              },
            }
          : {
              borderRadius: 21,
              width: "4rem",
              height: "4rem",
            }
      }
    >
      {children}

      <motion.div
        className="absolute"
        initial={{ x: "-50%" }}
        animate={{
          x: isExpanded ? "0%" : "-50%",
          transition: {
            type: "tween",
            ease: "easeOut",
            duration: 0.3,
          },
        }}
        style={{
          left: isExpanded ? "" : "50%",
          bottom: 6,
        }}
      >
        {isExpanded ? (
          <motion.div
            className="p-[10px] group bg-white/80 dark:bg-gray-800/80 border border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 rounded-full shadow-2xl transition-colors duration-300"
            onClick={toggleExpand}
            layoutId="expand-toggle"
            initial={false}
            animate={{
              rotate: -360,
              transition: {
                duration: 0.4,
              },
            }}
          >
            <XIcon
              className={cn(
                "h-7 w-7 text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors duration-200"
              )}
            />
          </motion.div>
        ) : (
          <motion.div
            className={cn(
              "p-[10px] group bg-gradient-to-br from-amber-500 to-orange-600 border border-amber-400/20 shadow-2xl transition-colors duration-200 hover:from-amber-600 hover:to-orange-700"
            )}
            style={{ borderRadius: 24 }}
            onClick={toggleExpand}
            layoutId="expand-toggle"
            initial={{ rotate: 180 }}
            animate={{
              rotate: -180,
              transition: {
                duration: 0.4,
              },
            }}
          >
            <PlusIcon className="h-7 w-7 text-white" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

export { FamilyButton }
export default FamilyButton
