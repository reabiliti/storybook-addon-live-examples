import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import prettier from 'prettier/standalone';
import parserBabel from 'prettier/parser-babel';
import { transpileTs } from './utils';
import { Language } from 'prism-react-renderer';

type UseCodeProps = {
    initialCode: string;
    live?: boolean;
    code?: string;
    language?: Language;
    mobileOnly?: string | boolean;
    desktopOnly?: string | boolean;
    view?: 'desktop' | 'mobile';
};

const CHUNK_SEPARATOR = /^\s*(?:@|\/\/)MOBILE@?/m;

const transpile = async (code: string) => {
    return prettier.format(await transpileTs(code), {
        parser: 'babel',
        plugins: [parserBabel],
    });
};

export function useCode({
    initialCode,
    desktopOnly,
    mobileOnly,
    live,
    language,
    view,
}: UseCodeProps) {
    const [ready, setReady] = useState(false);

    const needsTranspile = live && ['typescript', 'tsx'].includes(language);

    const [resetKey, setResetKey] = useState(+new Date());
    const [commonCode, setCommonCode] = useState('');
    const [mobileCode, setMobileCode] = useState('');
    const [desktopCode, setDesktopCode] = useState('');
    const [desktopInitialCode, setDesktopInitialCode] = useState('');
    const [mobileInitialCode, setMobileInitialCode] = useState('');

    const useCommonCode = CHUNK_SEPARATOR.exec(initialCode) === null;

    const prepareCode = async () => {
        let [desktop = '', mobile = ''] = await Promise.all(
            initialCode
                .split(CHUNK_SEPARATOR)
                .map((s) => s.trim())
                .map(async (codeChunk) =>
                    needsTranspile ? await transpile(codeChunk) : codeChunk,
                ),
        );

        setCommonCode(desktop);

        if (!useCommonCode) {
            setDesktopCode(desktop);
            setMobileCode(mobile);
            setDesktopInitialCode(desktop);
            setMobileInitialCode(mobile);
        }

        setReady(true);
    };

    useEffect(() => {
        prepareCode();
    }, []);

    let code = commonCode;
    let setCode = setCommonCode;
    let resetCode = () => {
        setResetKey(+new Date());
        setCommonCode(initialCode);
    };

    if (!useCommonCode) {
        if (view === 'desktop') {
            code = mobileOnly ? '' : desktopCode;
            setCode = setDesktopCode;
            resetCode = () => {
                setResetKey(+new Date());
                setDesktopCode(desktopInitialCode);
            };
        }

        if (view === 'mobile') {
            code = desktopOnly ? '' : mobileCode;
            setCode = setMobileCode;
            resetCode = () => {
                setResetKey(+new Date());
                setMobileCode(mobileInitialCode);
            };
        }
    }

    return {
        code,
        setCode,
        resetCode,
        resetKey,
        ready,
    };
}
