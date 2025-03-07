/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from "react";

export function useAsyncEffect<T>(
  asyncFunction: () => Promise<T>,
  onSuccess: (data: T) => void,
  onError?: ((error: unknown) => void) | React.DependencyList,
  onFinally?: (() => void) | React.DependencyList,
  deps?: React.DependencyList
) {
  const errorActuallyDeps = Array.isArray(onError) ? onError : deps;
  const finallyActuallyDeps = Array.isArray(onFinally) ? onFinally : deps;
  const dependencies = errorActuallyDeps || finallyActuallyDeps;

  useEffect(() => {
    let isCancelled = false;

    asyncFunction()
      .then((data) => {
        if (!isCancelled) {
          onSuccess(data);
        }
      })
      .catch((error) => {
        if (!isCancelled && typeof onError === "function") {
          onError(error);
        }
      })
      .finally(() => {
        if (!isCancelled && typeof onFinally === "function") {
          onFinally();
        }
      });

    return () => {
      isCancelled = true;
    };
  }, dependencies);
}

export default useAsyncEffect;
