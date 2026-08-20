import 'react'

declare global {
    namespace JSX {
        interface IntrinsicAttributes {
            key?: React.Key
        }
    }
}
